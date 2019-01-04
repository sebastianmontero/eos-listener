const BaseTableListener = require('./BaseTableListener');
const { AccountTypeIds, SpecialValues, DappTableIds, TableListenerModes } = require('../const');

const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class BlockProducerTableListener extends BaseTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        blockProducerDao,
    }) {
        super({
            dappTableId: DappTableIds.EOSIO_PRODUCERS,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.blockProducerDao = blockProducerDao;
        this.streamOptions.fetch = true;
        this.streamOptions.mode = TableListenerModes.REPLICATE;
        this.fieldsOfInterest = [
            'is_active',
            'url',
            'total_votes',
            'location',
        ];
    }

    _extractFields(row) {
        const {
            owner,
            total_votes,
            is_active,
            url,
            location,
        } = row;

        return {
            accountName: owner,
            isActive: Number(is_active) === 1,
            url,
            totalVotes: total_votes,
            location,
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
            this.blockProducerDao.batchInsert(toInsert);
        }
        console.log('batch inserts finished', new Date());
        const accountNamesToIds = await this.accountDao.getAccountIds(accountNames, AccountTypeIds.BLOCK_PRODUCER, NOT_APPLICABLE);
        for (let bp of inserted) {
            bp.accountId = accountNamesToIds[bp.accountName];
            this.blockProducerDao.batchUpdate(bp);
        }
        console.log('Resolved accounts', new Date());
        await this.blockProducerDao.flush();
        this.blockProducerDao.batchSize = 1;
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
        let toUpdate = await this._processRow(newRow);
        await this.blockProducerDao.batchUpdate(toUpdate);
    }

    async remove(payload) {
        const { oldRow: { owner } } = payload;
        await this.betDao.remove({
            accountId: await this._getAccountId(owner),
        });
    }

    async _getAccountId(owner) {
        return await this.accountDao.getAccountId(owner, AccountTypeIds.BLOCK_PRODUCER, NOT_APPLICABLE);
    }
}

module.exports = BlockProducerTableListener;
