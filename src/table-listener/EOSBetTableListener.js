const BaseBatchTableListener = require('./BaseBatchTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappIds, BetStatusIds, TokenIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class EOSBetTableListener extends BaseBatchTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        betDao
    }) {
        super({
            dappId: DappIds.EOS_BET,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.betDao = betDao;
    }

    async _insert(batchArray) {
        await this.betDao.insert(batchArray);
    }

    async insert(payload) {
        const {
            dappTableId,
            newRow: {
                id,
                bettor,
                bet_amt,
                bet_time,
            }
        } = payload;

        const placedDate = new Date(bet_time + 'Z');
        const placedDayId = TimeUtil.dayId(placedDate);

        const toInsert = {
            dappTableId,
            gameBetId: id,
            userAccountId: await this.accountDao.getAccountId(bettor, AccountTypeIds.USER, NOT_APPLICABLE),
            betAmount: bet_amt,
            betTokenId: TokenIds.EOS,
            winAmount: null,
            winTokenId: TokenIds.EOS,
            betStatusId: UNKNOWN,
            placedDayId,
            placedHourOfDay: placedDate.getUTCHours(),
            placedTime: bet_time,
            completedDayId: UNKNOWN,
            completedHourOfDay: null,
            completedTime: null,
        };
        await this._addToBatch(id, toInsert);

    }

    async update(payload) {
        const { dappTableId, newRow: { id } } = payload;
        logger.debug("EOS Bet Update, nothing to update, id: " + id);
    }

    async remove(payload) {
        const { dappTableId, oldRow: { id } } = payload;
        if (!this._removeFromBatch(id)) {
            await this.betDao.remove({
                dappTableId,
                gameBetId: id,
            });
        }
    }
}

module.exports = EOSBetTableListener;
