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
        this.streamOptions = {
            ...this.streamOptions,
            fetch: true,
            mode: TableListenerModes.REPLICATE,
            tableId: 'owner',
            serializeRowUpdates: true,
        }
        this.fieldsOfInterest = [
            'producers',
            'staked',
        ];
        this.batchSize = 50000;
        this.bpIds = null;
    }

    async _getBPId(bp) {
        if (!this.bpIds) {
            this.bpIds = await this.blockProducerDao.mapAccountIdToName();
        }
        if (!this.bpIds[bp]) {
            const id = await this.accountDao.selectAccountId(bp);
            if (id === null) {
                throw new Error(`Block producer: ${bp} does not exist`);
            }
            this.bpIds[bp] = id;
        }
        return this.bpIds[bp];
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
        processed.voterId = await this._getAccountId(processed.accountName);
        return processed;
    }

    async _processProducers(voter, votersProducers) {
        votersProducers = votersProducers || [];
        for (let bp of voter.producers) {
            const bpId = await this._getBPId(bp);
            votersProducers.push([
                voter.voterId,
                bpId,
                voter.votes,
            ]);
        }
        return votersProducers;
    }

    async snapshot(payload) {
        const { rows } = payload;
        console.log('Started processing snapshot', new Date());
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
                voter.voterId = usersToIds[voter.accountName];
                voters.push([
                    voter.voterId,
                    voter.isProxy,
                ]);
                await this._processProducers(voter, votersProducers);
            }
            await this.voterDao.insert(voters);
            console.log(`Loaded Voters from: ${start} to ${end}`, new Date());
            await this.voterBlockProducerDao.insert(votersProducers);
            console.log('Loaded VoterBlockProducer Table', new Date());
        }
        console.log('Finished processing snapshot', new Date());

    }

    async insert(payload) {
        console.log('Insert', payload);
        const voter = await this._processRow(payload.newRow);
        const { voterId, isProxy } = voter;
        await this.voterDao.insert([
            voterId,
            isProxy,
        ]);
        await this.voterBlockProducerDao.insert(await this._processProducers(voter));
    }

    async update(payload) {
        console.log('Update', payload);
        const voter = await this._processRow(payload.newRow);
        const { modifiedProps } = payload;
        const { voterId, votes } = voter;
        if (!modifiedProps.producers) {
            console.log('----Updating votes...------');
            await this.voterBlockProducerDao.updateVotes(voterId, votes);
            console.log('----Updated votes----');
        } else {
            console.log('----Revoting...-----');
            await this.voterBlockProducerDao.revote(voterId, await this._processProducers(voter));
            console.log('----Revoted-----');
        }
    }

    async remove(payload) {
        console.log('Remove', payload);
        const { voterId } = await this._processRow(payload.oldRow);
        await this.voterBlockProducerDao.deleteByVoterId(voterId);
        await this.voterDao.delete(voterId);
        console.log('Removed voter');
    }

    async _getAccountId(owner) {
        return await this.accountDao.getAccountId(owner, AccountTypeIds.USER, NOT_APPLICABLE);
    }
}

module.exports = VoterTableListener;
