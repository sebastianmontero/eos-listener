const BaseBatchTableListener = require('./BaseBatchTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappIds, BetStatusIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

const BET_COMPLETED = 2;

class FarmEOSTableListener extends BaseBatchTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        betDao
    }) {
        super({
            dappId: DappIds.FARM_EOS,
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
                bet_id,
                user_name,
                bet_amount,
                win_amount,
                bet_time,
                status,
            }
        } = payload;

        const { amount: betAmount, symbol: betSymbol } = Util.parseAsset(bet_amount);
        const { amount: winAmount, symbol: winSymbol } = Util.parseAsset(win_amount);
        const betTokenId = await this.tokenDao.getTokenId(betSymbol, UNKNOWN);
        const winTokenId = betSymbol == winSymbol ? betTokenId : await this.tokenDao.getTokenId(winSymbol, UNKNOWN);

        let betStatusId = status === BET_COMPLETED ? BetStatusIds.COMPLETED : BetStatusIds.PLACED;

        const placedDate = new Date(bet_time * 1000);
        const placedDayId = TimeUtil.dayId(placedDate);

        const toInsert = {
            dappTableId,
            gameBetId: bet_id,
            userAccountId: await this.accountDao.getAccountId(user_name, AccountTypeIds.USER, NOT_APPLICABLE),
            betAmount,
            betTokenId,
            winAmount,
            winTokenId,
            betStatusId,
            placedDayId,
            placedHourOfDay: placedDate.getUTCHours(),
            placedTime: TimeUtil.toUTCDateTimeNTZString(placedDate),
            completedDayId: UNKNOWN,
            completedHourOfDay: null,
            completedTime: null,
        };
        await this._addToBatch(bet_id, toInsert);

    }

    async update(payload) {
        const { dappTableId, newRow: { bet_id, win_amount, status } } = payload;

        if (status === BET_COMPLETED) {
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
        }
    }

    async remove(payload) {
        const { dappTableId, oldRow: { bet_id } } = payload;

        if (!this._removeFromBatch(bet_id)) {
            await this.betDao.remove({
                dappTableId,
                gameBetId: bet_id,
            });
        }
    }
}

module.exports = FarmEOSTableListener;
