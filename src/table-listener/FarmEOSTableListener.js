const BaseTableListener = require('./BaseTableListener');
const { TimeUtil, Util } = require('../util');
const { AccountTypeIds, SpecialValues, DappIds, BetStatusIds } = require('../const');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

const BET_COMPLETED = 2;

class FarmEOSTableListener extends BaseTableListener {
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
        this.streamOptions = {
            ...this.streamOptions,
            tableId: 'bet_id',
        };
    }

    async insert(payload) {
        const {
            codeAccountId,
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

        const placedDate = TimeUtil.fromUnixTimestamp(bet_time);
        const placedDayId = TimeUtil.dayId(placedDate);

        const toInsert = {
            codeAccountId,
            dappTableId,
            gameBetId: bet_id,
            actionId: NOT_APPLICABLE,
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
        await this.betDao.batchInsert(toInsert);

    }

    async update(payload) {
        const { dappTableId, newRow: { bet_id, win_amount, status } } = payload;

        if (status === BET_COMPLETED) {
            const { amount: winAmount, symbol: winSymbol } = Util.parseAsset(win_amount);
            const winTokenId = await this.tokenDao.getTokenId(winSymbol, UNKNOWN);

            const toUpdate = {
                dappTableId,
                gameBetId: bet_id,
                winAmount,
                winTokenId,
                betStatusId: BetStatusIds.COMPLETED,
                completedDayId: UNKNOWN,
                completedHourOfDay: null,
                completedTime: null,
            };
            await this.betDao.batchUpdate(toUpdate);
        }
    }

    async remove(payload) {
        const { dappTableId, oldRow: { bet_id } } = payload;
        this.betDao.batchRemove({
            dappTableId,
            gameBetId: bet_id,
        });
    }
}

module.exports = FarmEOSTableListener;
