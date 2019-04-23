const straw = require('straw');
const dbCon = require('../db/DBConnection');
const { AccountDao, TokenDao } = require('../dao');
const {
    AccountTypeIds,
    OrderTypeIds,
    SpecialValues,
} = require('../const');
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
            orderTypeId,
        } = msg;

        const ids = await Promise.all([
            this.accountDao.getAccountId(account, AccountTypeIds.USER, NOT_APPLICABLE.id),
            this.tokenDao.getTokenId(operationToken, UNKNOWN.id),
            this.tokenDao.getTokenId(counterpartToken, UNKNOWN.id),
        ]);

        let outputName = (OrderTypeIds.isMarketOrder(orderTypeId)) ?
            'market' : 'limit';

        let result = {
            ...msg,
            accountId: ids[0],
            operationTokenId: ids[1],
            counterpartTokenId: ids[2],
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