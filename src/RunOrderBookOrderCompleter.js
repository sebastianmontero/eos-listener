const config = require('config');
const dbCon = require('./db/DBConnection');
const { OrderBookDao, OrderBookChangeDao } = require('./dao');
const { TimeUtil } = require('./util');
const { OrderTypeIds, TableOperationTypeIds, MarketOperationTypeIds, SpecialValues, OrderStatusIds } = require('./const');
const logger = require('./Logger');
logger.configure('order-completer');

dbCon.init(config.db);

let { HASNT_HAPPENED } = SpecialValues;

class OrderBookOrderCompleter {

    async complete() {
        const orderBookChangeDao = new OrderBookChangeDao(dbCon);
        const orderBookDao = new OrderBookDao(dbCon);
        console.log('Selecting orders with missing insert...');
        const orderBookChanges = await orderBookChangeDao.selectOrdersWithMissingInsert();

        let changed = true;
        let insertOrder;
        for (let i = 0; i < orderBookChanges.length; i++) {
            let orderBookChange = orderBookChanges[i];
            let {
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
            } = orderBookChange;

            if (changed) {
                let insertOperationTime = TimeUtil.fromUnixTimestamp(createdAt);
                insertOrder = {
                    dappId,
                    orderId,
                    accountId,
                    operationTokenId,
                    counterpartTokenId,
                    price,
                    amount,
                    orderValue,
                    oldAmount: null,
                    oldOrderValue: null,
                    orderTypeId,
                    dayId: TimeUtil.dayId(insertOperationTime),
                    hourOfDay: insertOperationTime.getUTCHours(),
                    operationTime: insertOperationTime,
                    tableOperationTypeId: TableOperationTypeIds.INSERT,
                    marketOperationTypeId: orderTypeId == OrderTypeIds.BUY_LIMIT ? MarketOperationTypeIds.BUY_LIMIT : MarketOperationTypeIds.SELL_LIMIT,
                    blockNum: 54656123 + ((createdAt - 1556113549) * 2),
                    createdAt,
                };
                changed = false;
                console.log('Inserting change order: ', insertOrder);
                await orderBookChangeDao.batchInsert(insertOrder);
            }


            if (i == (orderBookChanges.length - 1) || orderId != orderBookChanges[i + 1].orderId || orderTypeId != orderBookChanges[i + 1].orderTypeId || createdAt != orderBookChanges[i + 1].createdAt) {

                let remainingAmount = amount,
                    remainingOrderValue = orderValue,
                    finishedDayId = HASNT_HAPPENED.id,
                    finishedHourOfDay = HASNT_HAPPENED.id,
                    finishedTime = null,
                    orderStatusId = OrderStatusIds.PARTIALLY_COMPLETED;

                if (tableOperationTypeId == TableOperationTypeIds.DELETE) {
                    if (marketOperationTypeId != MarketOperationTypeIds.DELETE) {
                        remainingAmount = 0;
                        remainingOrderValue = 0;
                        orderStatusId = OrderStatusIds.COMPLETED;
                    } else {
                        orderStatusId = insertOrder.amount > amount ? OrderStatusIds.PARTIALLY_COMPLETED_CANCELED : OrderStatusIds.CANCELED;
                    }
                    finishedDayId = dayId;
                    finishedHourOfDay = hourOfDay;
                    finishedTime = operationTime;
                }

                let order = {
                    dappId,
                    orderId,
                    accountId,
                    operationTokenId,
                    counterpartTokenId,
                    price,
                    amount: insertOrder.amount,
                    orderValue: insertOrder.orderValue,
                    remainingAmount,
                    remainingOrderValue,
                    orderTypeId,
                    orderStatusId,
                    placedDayId: insertOrder.dayId,
                    placedHourOfDay: insertOrder.hourOfDay,
                    placedTime: insertOrder.operationTime,
                    finishedDayId,
                    finishedHourOfDay,
                    finishedTime,
                    createdAt,
                };
                changed = true;
                console.log(`TableOperation: ${tableOperationTypeId} MarketOperation: ${marketOperationTypeId} `, order);
                console.log('Inserting order: ', order);
                await orderBookDao.batchInsert(order);
            }

        }
        console.log('Closing connection...');
        await dbCon.end();
    }
}

new OrderBookOrderCompleter().complete();