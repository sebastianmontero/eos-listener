const BaseTableListener = require('./BaseTableListener');
const { TimeUtil } = require('../util');
const { AccountTypeIds, SpecialValues, DappIds, TokenIds } = require('../const');
const { logger } = require('../Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class FastwinTableListener extends BaseTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        betDao
    }) {
        super({
            dappId: DappIds.FASTWIN,
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
                bettor,
                bet_amt,
                bet_time,
            }
        } = payload;

        const placedDate = new Date(bet_time + 'Z');
        const placedDayId = TimeUtil.dayId(placedDate);

        const toInsert = {
            codeAccountId,
            dappTableId,
            gameBetId: id,
            actionId: NOT_APPLICABLE,
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

module.exports = FastwinTableListener;
