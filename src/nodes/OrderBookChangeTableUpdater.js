const straw = require('straw');
const dbCon = require('../db/DBConnection');

const { OrderBookChangeDao } = require('../dao');
const logger = require('../Logger').configure('order-book-change-table-updater');

module.exports = straw.node({
    initialize: function (opts, done) {
        dbCon.init(opts.config.db);
        this.orderBookChangeDao = new OrderBookChangeDao(dbCon);
        done();
    },

    process: async function (msg, done) {

        try {
            const {
                dappId,
                orderId,
                accountId,
                operationTokenId,
                counterpartTokenId,
                price,
                amount,
                orderValue,
                oldAmount,
                oldOrderValue,
                orderTypeId,
                dayId,
                hourOfDay,
                operationTime,
                tableOperationTypeId,
                marketOperationTypeId,
                blockNum,
                createdAt,
            } = msg;

            console.log('OrderBookChange: ', JSON.stringify(msg));

            let toInsert = {
                dappId,
                orderId,
                accountId,
                operationTokenId,
                counterpartTokenId,
                price,
                amount,
                orderValue,
                oldAmount,
                oldOrderValue,
                orderTypeId,
                dayId,
                hourOfDay,
                operationTime: new Date(operationTime),
                tableOperationTypeId,
                marketOperationTypeId,
                blockNum,
                createdAt,
            };
            console.log(toInsert);
            await this.orderBookChangeDao.batchInsert(toInsert);
            done(false);
        } catch (error) {
            logger.error('Error while processing and inserting order book change.', error);
            throw error;

        }
    },

    stop: async function (done) {
        logger.info('Stopping...');
        await this.tradeDao.flush();
        await dbCon.end();
        logger.info('Closed database connection.');
        done(false);
    }
});