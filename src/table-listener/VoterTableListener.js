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
        let inserted = [];
        let accountNames = [];
        for (let row of rows) {
            const toInsert = this._extractFields(row);
            inserted.push(toInsert);
            accountNames.push(toInsert.accountName);
        }
        console.log('Extract fields finished', new Date());
        const usersToIds = await this.accountDao.getAccountIds(accountNames, AccountTypeIds.USER, NOT_APPLICABLE);
        const bpToIds = await this.blockProducerDao.mapAccountIdToName();
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
                if (!bpId) {
                    //console.log("Not found: ", bp);
                }
                votersProducers.push([
                    voterId,
                    bpId,
                    voter.votes,
                ]);
            }
        }
        await this.voterDao.insert(voters);
        console.log('Loaded Voter Table', new Date());
        await this.voterBlockProducerDao.insert(votersProducers);
        console.log('Loaded VoterBlockProducer Table', new Date());
        console.log('Finished processing snapshot', new Date());
    }

    async insert(payload) {
        const toInsert = await this._processRow(payload.newRow);
        await this.blockProducerDao.batchInsert(toInsert);
    }

    async update(payload) {
        /* console.log('Update');
        await this._update(payload.newRow); */
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
