const BaseTableListener = require('./BaseTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappTableIds, BetStatusIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class PokerEOSBullBetRecordTableListener extends BaseTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        betDao
    }) {
        super({
            dappTableId: DappTableIds.POKEREOSBULL_BETRECORD,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.betDao = betDao;
        this.streamOptions = {
            ...this.streamOptions,
            tableId: 'billid',
        };
    }

    _determineBetAmount(betVector) {
        let betAmount = 0;
        let betSymbol;
        for (let bet of betVector) {
            const { amount, symbol } = Util.parseAsset(bet.betAmount);
            betAmount += amount;
            betSymbol = symbol;
        }
        return {
            betAmount,
            betSymbol,
        };
    }

    async insert(payload) {
        const {
            dappTableId,
            newRow: {
                billid,
                vecBets,
                created_at,
                player,
                playerWin

            }
        } = payload;

        const placedDate = TimeUtil.fromUnixTimestamp(created_at);
        const placedDayId = TimeUtil.dayId(placedDate);
        const { betAmount, betSymbol } = this._determineBetAmount(vecBets);
        let { amount: winAmount } = Util.parseAsset(playerWin);
        if (winAmount < 0) {
            winAmount = 0;
        }
        const betTokenId = await this.tokenDao.getTokenId(betSymbol, UNKNOWN);

        const toInsert = {
            dappTableId,
            gameBetId: billid,
            userAccountId: await this.accountDao.getAccountId(player, AccountTypeIds.USER, NOT_APPLICABLE),
            betAmount: betAmount,
            betTokenId: betTokenId,
            winAmount,
            winTokenId: betTokenId,
            betStatusId: BetStatusIds.COMPLETED,
            placedDayId,
            placedHourOfDay: placedDate.getUTCHours(),
            placedTime: TimeUtil.toUTCDateTimeNTZString(placedDate),
            completedDayId: UNKNOWN,
            completedHourOfDay: null,
            completedTime: null,
        };
        await this.betDao.batchInsert(toInsert);

    }

    async update(payload) {
        const { dappTableId, newRow: { billid } } = payload;
        logger.debug("EOS Bet Update, nothing to update, id: " + billid);
    }

    async remove(payload) {
        const { dappTableId, oldRow: { billid } } = payload;
        await this.betDao.batchRemove({
            dappTableId,
            gameBetId: billid,
        });
    }
}

module.exports = PokerEOSBullBetRecordTableListener;
