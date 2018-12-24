const BaseBatchTableListener = require('./BaseBatchTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappIds, BetStatusIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class EndlessDiceTableListener extends BaseBatchTableListener {
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
    }

    async _insert(batchArray) {
        await this.betDao.insert(batchArray);
    }

    async insert(payload) {
        const {
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

        const placedDate = new Date(created_at * 1000);
        const placedDayId = TimeUtil.dayId(placedDate);

        const toInsert = {
            dappTableId,
            gameBetId: id,
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
        await this._addToBatch(id, toInsert);

    }

    async update(payload) {
        const { dappTableId, newRow: { id } } = payload;

        logger.debug("Endless Dice Update, nothing to update, id: " + id);

        /* if (status === BET_COMPLETED) {
            const { amount: winAmount } = Util.parseAsset(win_amount);
            let bet = this._getObj(bet_id);
            if (bet) {
                bet.winAmount = winAmount;
                bet.betStatusId = BetStatusIds.COMPLETED;
                logger.debug('Found in batch, updated, id: ', bet_id);
            } else {
                const toUpdate = {
                    dappTableId,
                    gameBetId: bet_id,
                    winAmount,
                    betStatusId: BetStatusIds.COMPLETED,
                    completedDayId: UNKNOWN,
                    completedHourOfDay: null,
                    completedTime: null,
                };
                logger.debug(toUpdate);
                await this.betDao.update(toUpdate);
            }
        } */
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

module.exports = EndlessDiceTableListener;
