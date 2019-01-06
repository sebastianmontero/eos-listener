const BaseTableListener = require('./BaseTableListener');
const { AccountTypeIds, SpecialValues, DappTableIds, TableListenerModes } = require('../const');

const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class VoterTableListener extends BaseTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        blockProducerDao,
        voterDao,
        voterBlockProducerDao,
    }) {
        super({
            dappTableId: DappTableIds.EOSIO_VOTERS,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.blockProducerDao = blockProducerDao;
        this.voterDao = voterDao;
        this.voterBlockProducerDao = voterBlockProducerDao;
        this.streamOptions.fetch = true;
        this.streamOptions.mode = TableListenerModes.REPLICATE;
        this.fieldsOfInterest = [
            'producers',
            'staked',
        ];
        this.batchSize = 50000;
    }

    _extractFields(row) {
        const {
            owner,
            producers,
            staked,
            is_proxy,
        } = row;

        return {
            accountName: owner,
            producers: producers,
            isProxy: Number(is_proxy) === 1,
            votes: staked,
        };
    }

    async _processRow(row) {
        let processed = this._extractFields(row);
        processed.accountId = await this._getAccountId(processed.accountName);
        return processed;
    }

    async snapshot(payload) {
        const { rows } = payload;
        console.log('Started processing snapshot', new Date());
        const bpToIds = await this.blockProducerDao.mapAccountIdToName();
        console.log('Obtained Block Producer Id Map', new Date());
        let numBatches = Math.ceil(rows.length / this.batchSize);
        for (let i = 0; i < numBatches; i++) {
            let start = i * this.batchSize;
            let end = Math.min(rows.length, start + this.batchSize);
            let inserted = [];
            let accountNames = [];
            for (let j = start; j < end; j++) {
                const toInsert = this._extractFields(rows[j]);
                inserted.push(toInsert);
                accountNames.push(toInsert.accountName);
            }
            const usersToIds = await this.accountDao.getAccountIds(accountNames, AccountTypeIds.USER, NOT_APPLICABLE);
            console.log('Obtained Id maps', new Date());
            let voters = [];
            let votersProducers = [];
            for (let voter of inserted) {
                const voterId = usersToIds[voter.accountName];
                voters.push([
                    voterId,
                    voter.isProxy
                ]);
                for (let bp of voter.producers) {
                    const bpId = bpToIds[bp];
                    votersProducers.push([
                        voterId,
                        bpId,
                        voter.votes,
                    ]);
                }
            }
            await this.voterDao.insert(voters);
            console.log(`Loaded Voters from: ${start} to ${end}`, new Date());
            await this.voterBlockProducerDao.insert(votersProducers);
            console.log('Loaded VoterBlockProducer Table', new Date());
        }
        console.log('Finished processing snapshot', new Date());

    }

    async insert(payload) {
        const toInsert = await this._processRow(payload.newRow);
        await this.blockProducerDao.batchInsert(toInsert);
    }

    async update(payload) {
        console.log('Update');
        await this._update(payload.newRow);
    }

    async _update(newRow) {
        /* let toUpdate = await this._processRow(newRow);
        await this.blockProducerDao.batchUpdate(toUpdate); */
    }

    async remove(payload) {
        /* const { oldRow: { owner } } = payload;
        await this.betDao.remove({
            accountId: await this._getAccountId(owner),
        }); */
    }

    async _getAccountId(owner) {
        return await this.accountDao.getAccountId(owner, AccountTypeIds.BLOCK_PRODUCER, NOT_APPLICABLE);
    }
}

module.exports = VoterTableListener;
