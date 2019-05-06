const straw = require('straw');
const dbCon = require('../db/DBConnection');
const { AccountDao, TokenDao } = require('../dao');
const {
    DappIds,
    AccountTypeIds,
    OrderTypeIds,
    SpecialValues,
    TableOperationTypeIds,
    MarketOperationTypeIds,
} = require('../const');
const { TimeUtil } = require('../util');
const logger = require('../Logger').configure('exchange-order-id-fetcher');

const { NOT_APPLICABLE, UNKNOWN } = SpecialValues;

module.exports = straw.node({
    initialize: function (opts, done) {
        dbCon.init(opts.config.db);
        this.accountDao = new AccountDao(dbCon);
        this.tokenDao = new TokenDao(dbCon);
        done();
    },
    process: async function (msg, done) {
        const {
            operationToken,
            counterpartToken,
            account,
            orderType,
            tableOperation,
            operationTime,
            action,
        } = msg;

        const ids = await Promise.all([
            this.accountDao.getAccountId(account, AccountTypeIds.USER, NOT_APPLICABLE.id),
            this.tokenDao.getTokenId(operationToken, UNKNOWN.id),
            this.tokenDao.getTokenId(counterpartToken, UNKNOWN.id),
        ]);
        const orderTypeId = OrderTypeIds.getOrderTypeId(orderType);
        let outputName = (OrderTypeIds.isMarketOrder(orderTypeId)) ?
            'market' : 'limit';

        let result = {
            ...msg,
            dappId: DappIds.GYFTIE_EXCHANGE,
            accountId: ids[0],
            operationTokenId: ids[1],
            counterpartTokenId: ids[2],
            orderTypeId,
            dayId: TimeUtil.dayId(new Date(operationTime)),
            tableOperationTypeId: TableOperationTypeIds.getTableOp(tableOperation),
            marketOperationTypeId: MarketOperationTypeIds.getMarketOpTypeId(action),
        };

        console.log(outputName, result);

        this.output(outputName, result);
        done(false);
    },

    stop: async function (done) {
        logger.info('Stopping...');
        await dbCon.end();
        logger.info('Closed database connection.');
        done(false);
    }
});