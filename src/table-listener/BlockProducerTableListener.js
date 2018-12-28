
const BaseTableListener = require('./BaseTableListener');
const { TimeUtil } = require('../util');
const { AccountTypeIds, SpecialValues, DappTableIds, TokenIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class BlockProducerTableListener extends BaseTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        blockProducerDao,
    }) {
        super({
            dappId: DappTableIds.EOS_BET,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.blockProducerDao = blockProducerDao;
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
        await this.blockProducerDao.batchInsert(this._processPayload(payload));
    }

    async update(payload) {
        await this.blockProducerDao.batchUpdate(this._processPayload(payload));
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
