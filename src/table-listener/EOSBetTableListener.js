const BaseTableListener = require('./BaseTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappIds, TokenIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class EOSBetTableListener extends BaseTableListener {
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
        const { amount: betAmount, symbol: betSymbol } = Util.parseAsset(bet_amt);
        const betTokenId = await this.tokenDao.getTokenId(betSymbol, UNKNOWN);

        const toInsert = {
            dappTableId,
            gameBetId: id,
            userAccountId: await this.accountDao.getAccountId(bettor, AccountTypeIds.USER, NOT_APPLICABLE),
            betAmount: betAmount,
            betTokenId: betTokenId,
            winAmount: null,
            winTokenId: betTokenId,
            betStatusId: UNKNOWN,
            placedDayId,
            placedHourOfDay: placedDate.getUTCHours(),
            placedTime: bet_time,
            completedDayId: UNKNOWN,
            completedHourOfDay: null,
            completedTime: null,
        };
        await this.betDao.batchInsert(toInsert);

    }

    async update(payload) {
        const { dappTableId, newRow: { id } } = payload;
        logger.debug("EOS Bet Update, nothing to update, id: " + id);
    }

    async remove(payload) {
        const { dappTableId, oldRow: { id } } = payload;
        await this.betDao.batchRemove({
            dappTableId,
            gameBetId: id,
        });
    }
}

module.exports = EOSBetTableListener;
