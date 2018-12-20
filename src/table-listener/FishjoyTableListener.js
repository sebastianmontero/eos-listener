const BaseBatchTableListener = require('./BaseBatchTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappIds, BetStatusIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class FishjoyTableListener extends BaseBatchTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        betDao
    }) {
        super({
            dappId: DappIds.FISH_JOY,
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
        const { dappTableId, newRow: { id, buyer, eosToken, create_time, result } } = payload;
        logger.debug('---INSERT---, dappTableId: ', dappTableId);
        logger.debug('Table delta message: ', payload.message);

        const { amount: betAmount, symbol: betSymbol } = Util.parseAsset(eosToken);
        const betTokenId = await this.tokenDao.getTokenId(betSymbol, UNKNOWN);

        let winAmount, winTokenId, betStatusId;

        winTokenId = betTokenId;

        if (result == 1) {
            winAmount = betAmount;
            betStatusId = BetStatusIds.COMPLETED;
        } else {
            winAmount = 0;
            betStatusId = UNKNOWN;
        }
        const placedDate = new Date(create_time + 'Z');
        const placedDayId = TimeUtil.dayId(placedDate);

        const toInsert = {
            dappTableId,
            gameBetId: id,
            userAccountId: await this.accountDao.getAccountId(buyer, AccountTypeIds.USER, NOT_APPLICABLE),
            betAmount,
            betTokenId,
            winAmount,
            winTokenId,
            betStatusId,
            placedDayId,
            placedHourOfDay: placedDate.getUTCHours(),
            placedTime: create_time,
            completedDayId: UNKNOWN,
            completedHourOfDay: null,
            completedTime: null,
        };
        await this._addToBatch(id, toInsert);

    }

    async update(payload) {
        const { dappTableId, newRow: { id, eosToken, result } } = payload;

        logger.debug('---UPDATE---, dappTableId: ', dappTableId);
        logger.debug('Table delta message: ', payload.message);

        if (result == 1) {
            let bet = this._getObj(id);
            if (bet) {
                bet.winAmount = bet.betAmount;
                bet.betStatusId = BetStatusIds.COMPLETED;
                logger.debug('Found in batch, updated, id: ', id);
            } else {
                const { amount: winAmount, symbol: winSymbol } = Util.parseAsset(eosToken);
                const winTokenId = await this.tokenDao.getTokenId(winSymbol, UNKNOWN);
                const toUpdate = {
                    dappTableId,
                    gameBetId: id,
                    winAmount,
                    winTokenId,
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
        const { dappTableId, oldRow: { id } } = payload;
        logger.debug('---REMOVE---, dappTableId: ', dappTableId);
        logger.debug('Table delta message: ', payload.message);
        if (!this._removeFromBatch(id)) {
            await this.betDao.remove({
                dappTableId,
                gameBetId: id,
            });
        }
    }
}

module.exports = FishjoyTableListener;
