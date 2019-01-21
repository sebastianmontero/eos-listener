const BaseTableListener = require('./BaseTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappIds, BetStatusIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class EndlessDiceTableListener extends BaseTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        betDao
    }) {
        super({
            dappId: DappIds.ENDLESS_DICE,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.betDao = betDao;
        this.streamOptions = {
            ...this.streamOptions,
            tableId: 'id',
        };
    }

    async insert(payload) {
        const {
            codeAccountId,
            dappTableId,
            newRow: {
                id,
                player,
                amount,
                et_amount,
                created_at,
            }
        } = payload;

        const { amount: betAmount, symbol: betSymbol } = Util.parseAsset(amount);
        const { amount: winAmount, symbol: winSymbol } = Util.parseAsset(et_amount);
        const betTokenId = await this.tokenDao.getTokenId(betSymbol, UNKNOWN);
        const winTokenId = await this.tokenDao.getTokenId(winSymbol, UNKNOWN);

        const placedDate = TimeUtil.fromUnixTimestamp(created_at);
        const placedDayId = TimeUtil.dayId(placedDate);

        const toInsert = {
            codeAccountId,
            dappTableId,
            gameBetId: id,
            actionId: NOT_APPLICABLE,
            userAccountId: await this.accountDao.getAccountId(player, AccountTypeIds.USER, NOT_APPLICABLE),
            betAmount,
            betTokenId,
            winAmount,
            winTokenId,
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
        const { dappTableId, newRow: { id } } = payload;

        logger.debug("Endless Dice Update, nothing to update, id: " + id);
    }

    async remove(payload) {
        const { dappTableId, oldRow: { id } } = payload;
        await this.betDao.batchRemove({
            dappTableId,
            gameBetId: id,
        });
    }
}

module.exports = EndlessDiceTableListener;
