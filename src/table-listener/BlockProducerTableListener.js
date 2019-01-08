const BaseTableListener = require('./BaseTableListener');
const { AccountTypeIds, SpecialValues, DappTableIds, TableListenerModes } = require('../const');
const { logger } = require('../Logger');


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
        this.streamOptions = {
            ...this.streamOptions,
            fetch: true,
            mode: TableListenerModes.REPLICATE,
            tableId: 'owner',
            serializeRowUpdates: true,
        };
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
        logger.info('Started processing block producer snapshot', new Date());
        let processed = [];
        let accountNames = [];
        for (let row of rows) {
            const toInsert = this._extractFields(row);
            processed.push(toInsert);
            accountNames.push(toInsert.accountName);
        }
        logger.info('Block producer batch inserts finished', new Date());
        const accountNamesToIds = await this.accountDao.getAccountIds(accountNames, AccountTypeIds.BLOCK_PRODUCER, NOT_APPLICABLE);
        for (let bp of processed) {
            bp.accountId = accountNamesToIds[bp.accountName];
        }
        logger.info('Resolved block producer accounts', new Date());
        await this.blockProducerDao.insertObj(processed);
        logger.info('Finished processing block producer snapshot', new Date());
    }

    async insert(payload) {
        const toInsert = await this._processRow(payload.newRow);
        await this.blockProducerDao.insertObj(toInsert);
    }

    async update(payload) {
        let toUpdate = await this._processRow(payload.newRow);
        await this.blockProducerDao.update(toUpdate);
    }

    async remove(payload) {
        const { oldRow: { owner } } = payload;
        await this.blockProducerDao.delete({
            accountId: await this._getAccountId(owner),
        });
    }

    async _getAccountId(owner) {
        return await this.accountDao.getAccountId(owner, AccountTypeIds.BLOCK_PRODUCER, NOT_APPLICABLE);
    }
}

module.exports = BlockProducerTableListener;
