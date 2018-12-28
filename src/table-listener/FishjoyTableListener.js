const BaseTableListener = require('./BaseTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappIds, BetStatusIds } = require('../const');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

const WON_BET = 1; //It's known when bet is won, but are not able to determine between if the bet has been lost or it hasn't been completed

class FishjoyTableListener extends BaseTableListener {
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

    async insert(payload) {
        const { dappTableId, newRow: { id, buyer, eosToken, create_time, result } } = payload;
        const { amount: betAmount, symbol: betSymbol } = Util.parseAsset(eosToken);
        const betTokenId = await this.tokenDao.getTokenId(betSymbol, UNKNOWN);

        let winAmount, winTokenId, betStatusId;

        winTokenId = betTokenId;

        if (result == WON_BET) {
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
        await this.betDao.batchInsert(toInsert);

    }

    async update(payload) {
        const { dappTableId, newRow: { id, eosToken, result } } = payload;

        if (result == WON_BET) {
            const { amount: winAmount } = Util.parseAsset(eosToken);
            const toUpdate = {
                dappTableId,
                gameBetId: id,
                winAmount,
                betStatusId: BetStatusIds.COMPLETED,
                completedDayId: UNKNOWN,
                completedHourOfDay: null,
                completedTime: null,
            };

            await this.betDao.batchUpdate(toUpdate);
        }
    }

    async remove(payload) {
        const { dappTableId, oldRow: { id } } = payload;
        await this.betDao.batchRemove({
            dappTableId,
            gameBetId: id,
        });
    }
}

module.exports = FishjoyTableListener;
