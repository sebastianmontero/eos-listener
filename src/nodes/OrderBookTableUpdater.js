const straw = require('straw');
const dbCon = require('../db/DBConnection');
const {
    MarketOperationTypeIds,
    OrderTypeIds,
    TableOperationTypeIds,
    OrderStatusIds,
    SpecialValues,
} = require('../const')
const { OrderBookDao } = require('../dao');
const logger = require('../Logger').configure('order-book-table-updater');

const { HASNT_HAPPENED } = SpecialValues;

module.exports = straw.node({
    initialize: function (opts, done) {
        dbCon.init(opts.config.db);
        this.orderBookDao = new OrderBookDao(dbCon);
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
                orderTypeId,
                dayId,
                hourOfDay,
                operationTime,
                tableOperationTypeId,
                marketOperationTypeId,
                createdAt,
            } = msg;

            let {
                remainingAmount,
                remainingOrderValue,
            } = msg;

            let operationTimeDate = new Date(operationTime);
            console.log('OrderBook: ', JSON.stringify(msg));

            let orderStatusId,
                finishedDayId = HASNT_HAPPENED.id,
                finishedHourOfDay = HASNT_HAPPENED.id,
                finishedTime = null;

            if (tableOperationTypeId == TableOperationTypeIds.INSERT) {

                if (OrderTypeIds.isMarketOrder(orderTypeId)) {
                    orderStatusId = remainingAmount > 0 ? OrderStatusIds.PARTIALLY_COMPLETED_CLOSED : OrderStatusIds.COMPLETED;
                    finishedDayId = dayId;
                    finishedHourOfDay = hourOfDay;
                    finishedTime = operationTimeDate;
                } else {
                    orderStatusId = OrderStatusIds.OPEN;
                    remainingAmount = amount;
                    remainingOrderValue = orderValue;

                }

                let toInsert = {
                    dappId,
                    orderId,
                    accountId,
                    operationTokenId,
                    counterpartTokenId,
                    price,
                    amount,
                    orderValue,
                    remainingAmount,
                    remainingOrderValue,
                    orderTypeId,
                    orderStatusId,
                    placedDayId: dayId,
                    placedHourOfDay: hourOfDay,
                    placedTime: operationTimeDate,
                    finishedDayId,
                    finishedHourOfDay,
                    finishedTime,
                    createdAt,
                };
                console.log(toInsert);
                await this.orderBookDao.batchInsert(toInsert);
            } else {
                if (tableOperationTypeId == TableOperationTypeIds.DELETE) {
                    if (marketOperationTypeId == MarketOperationTypeIds.DELETE) {
                        const order = await this.orderBookDao.selectById(orderId, orderTypeId, createdAt);
                        if (!order) {
                            throw new Error(`Order with id: ${orderId}, type: ${orderTypeId}, createdAt: ${createdAt} not found.`);
                        }
                        orderStatusId = order.order_status_id == OrderStatusIds.OPEN ? OrderStatusIds.CANCELED : OrderStatusIds.PARTIALLY_COMPLETED_CANCELED;
                        remainingAmount = amount;
                        remainingOrderValue = orderValue;
                    } else {
                        orderStatusId = OrderStatusIds.COMPLETED;
                        remainingAmount = 0;
                        remainingOrderValue = 0;
                    }
                    finishedDayId = dayId;
                    finishedHourOfDay = hourOfDay;
                    finishedTime = operationTimeDate;
                } else if (tableOperationTypeId == TableOperationTypeIds.UPDATE) {
                    orderStatusId = OrderStatusIds.PARTIALLY_COMPLETED;
                    remainingAmount = amount;
                    remainingOrderValue = orderValue;
                }
                let toUpdate = {
                    remainingAmount,
                    remainingOrderValue,
                    orderStatusId,
                    finishedDayId,
                    finishedHourOfDay,
                    finishedTime,
                    orderId,
                    orderTypeId,
                    createdAt,
                };
                console.log(toUpdate);
                await this.orderBookDao.batchUpdate(toUpdate);
            }

        } catch (error) {
            logger.error('Error while processing and updating order book table.', error);
            throw error;

        } finally {
            done(false);
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