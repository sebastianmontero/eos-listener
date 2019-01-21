const BaseTableListener = require('./BaseTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappTableIds, BetStatusIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class PokerEOSGameGamesRecordTableListener extends BaseTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        betDao
    }) {
        super({
            dappTableId: DappTableIds.POKEREOSGAME_GAMESRECORD,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.betDao = betDao;
        this.streamOptions = {
            ...this.streamOptions,
            tableId: 'gameid',
        };
    }

    async insert(payload) {
        const {
            dappTableId,
            codeAccountId,
            newRow: {
                gameid,
                cellAmount,
                created_at,
                dispatched_at,
                player,
                isWin,
                playerWin

            }
        } = payload;

        const placedDate = TimeUtil.fromUnixTimestamp(created_at);
        const placedDayId = TimeUtil.dayId(placedDate);
        const completedDate = TimeUtil.fromUnixTimestamp(dispatched_at);
        const completedDayId = TimeUtil.dayId(completedDate);
        const { amount, symbol } = Util.parseAsset(playerWin.replace('-', ''));
        let betAmount, winAmount;
        if (isWin) {
            betAmount = Util.parseAsset(cellAmount).amount;
            winAmount = amount;
        } else {
            betAmount = amount;
            winAmount = 0;
        }
        const betTokenId = await this.tokenDao.getTokenId(symbol, UNKNOWN);

        const toInsert = {
            codeAccountId,
            dappTableId,
            gameBetId: gameid,
            actionId: NOT_APPLICABLE,
            userAccountId: await this.accountDao.getAccountId(player, AccountTypeIds.USER, NOT_APPLICABLE),
            betAmount: betAmount,
            betTokenId: betTokenId,
            winAmount,
            winTokenId: betTokenId,
            betStatusId: BetStatusIds.COMPLETED,
            placedDayId,
            placedHourOfDay: placedDate.getUTCHours(),
            placedTime: TimeUtil.toUTCDateTimeNTZString(placedDate),
            completedDayId,
            completedHourOfDay: completedDate.getUTCHours(),
            completedTime: TimeUtil.toUTCDateTimeNTZString(completedDate),
        };
        await this.betDao.batchInsert(toInsert);

    }

    async update(payload) {
        const { dappTableId, newRow: { gameid } } = payload;
        logger.debug("EOS Bet Update, nothing to update, id: " + gameid);
    }

    async remove(payload) {
        const { dappTableId, oldRow: { gameid } } = payload;
        await this.betDao.batchRemove({
            dappTableId,
            gameBetId: gameid,
        });
    }
}

module.exports = PokerEOSGameGamesRecordTableListener;
