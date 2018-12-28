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
    }

    async _processPayload(payload) {
        const {
            newRow: {
                owner,
                total_votes,
                is_active,
                url,
                location,
            }
        } = payload;

        return {
            accountId: await this._getAccountId(owner),
            isActive: Number(is_active) === 1,
            url,
            totalVotes: total_votes,
            location,
        };
    }

    async insert(payload) {
        const toInsert = await this._processPayload(payload);
        await this.blockProducerDao.batchInsert(toInsert);
    }

    async update(payload) {
        const toUpdate = await this._processPayload(payload);
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
