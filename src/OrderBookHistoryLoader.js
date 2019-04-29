const dbCon = require('./db/DBConnection');
const {
    TokenDao,
    OrderBookChangeDao,
    OrderBookHistoryDao,
} = require('./dao');

const {
    DappIds,
    OrderTypeIds,
    Tokens,
    SpecialValues,
    TableOperationTypeIds,
    MarketOperationTypeIds,
} = require('./const');
const { logger } = require('./Logger');

const { UNKNOWN } = SpecialValues;

class OrderBookHistoryLoader {

    constructor() {
        this.tokenDao = new TokenDao(dbCon);
        this.orderBookHistoryDao = new OrderBookHistoryDao(dbCon);
        this.orderBookChangeDao = new OrderBookChangeDao(dbCon);
    }

    async start() {

        const eosId = await this.tokenDao.getTokenId(Tokens.EOS, UNKNOWN.id);
        const gftId = await this.tokenDao.getTokenId(Tokens.GFT, UNKNOWN.id);
        let baseProps = {
            dappId: DappIds.GYFTIE_EXCHANGE,
            operationTokenId: gftId,
            counterpartTokenId: eosId,
        };

        let current = {};
        let lastCompleteDayId = await this.orderBookHistoryDao.selectLastCompleteDayId();
        logger.info('LatestCompleteDayId: ', lastCompleteDayId);
        let currentDayId = null;
        if (lastCompleteDayId) {
            logger.info('Selecting latest state... ');
            current = await this._getLatestState(lastCompleteDayId);
            logger.info('Latest state: ', current);
            this._reset(current);
            currentDayId = lastCompleteDayId + 1;
        }
        this._complete(current, baseProps);

        logger.info('Selecting order book changes...');
        const orderChanges = await this.orderBookChangeDao.selectFrom(currentDayId);

        for (const orderChange of orderChanges) {
            let {
                amount,
                orderValue,
                oldAmount,
                oldOrderValue,
                orderTypeId,
                dayId,
                tableOperationTypeId,
                marketOperationTypeId,
            } = orderChange;

            if (!currentDayId || dayId != currentDayId) {
                if (currentDayId) {
                    await this._insertGap(current, currentDayId, dayId);
                }
                currentDayId = dayId;
            }
            let obj = current[orderTypeId];
            amount = Number(amount);
            orderValue = Number(orderValue);
            oldAmount = Number(oldAmount);
            oldOrderValue = Number(oldOrderValue);
            if (tableOperationTypeId == TableOperationTypeIds.INSERT) {
                obj.totalOpenAmount += amount;
                obj.totalOpenOrderValue += orderValue;
                obj.openOrderCount++;
            } else if (tableOperationTypeId == TableOperationTypeIds.DELETE) {
                obj.totalOpenAmount -= amount;
                obj.totalOpenOrderValue -= orderValue;
                obj.openOrderCount--;
                if (marketOperationTypeId == MarketOperationTypeIds.DELETE) {
                    obj.totalCanceledAmount += amount;
                    obj.totalCanceledOrderValue += orderValue;
                    obj.canceledOrderCount++;
                }
            } else {
                obj.totalOpenAmount -= (oldAmount - amount);
                obj.totalOpenOrderValue -= (oldOrderValue - orderValue);
            }
        }

        if (orderChanges.length > 0) {
            await this._insertDay(current, currentDayId);
        }
        logger.info('Flushing changes...');
        await this.orderBookHistoryDao.flush();
        logger.info('Closing db connection...');
        await dbCon.end();
        logger.info('Closed db connection');
    }

    _reset(current) {
        for (let key in current) {
            let obj = current[key];
            obj.totalCanceledAmount = 0;
            obj.totalCanceledOrderValue = 0;
            obj.canceledOrderCount = 0;
        }
    }

    async _insertGap(current, currentDayId, nextDayId) {
        for (let dayId = currentDayId; dayId < nextDayId; dayId++) {
            await this._insertDay(current, dayId);
            this._reset(current);
        }
    }

    async _insertDay(current, dayId) {
        let orderTypeIds = [OrderTypeIds.BUY_LIMIT, OrderTypeIds.SELL_LIMIT];

        for (let orderTypeId of orderTypeIds) {
            await this.orderBookHistoryDao.batchInsert({
                ...current[orderTypeId],
                dayId,
            });
        }
    }

    _complete(current, baseProps) {
        let orderTypeIds = [OrderTypeIds.BUY_LIMIT, OrderTypeIds.SELL_LIMIT];

        for (let orderTypeId of orderTypeIds) {
            if (!current[orderTypeId]) {
                current[orderTypeId] = {
                    ...baseProps,
                    orderTypeId,
                    totalOpenAmount: 0,
                    totalOpenOrderValue: 0,
                    totalCanceledAmount: 0,
                    totalCanceledOrderValue: 0,
                    openOrderCount: 0,
                    canceledOrderCount: 0,
                };
            }
        }
    }

    async _getLatestState(lastCompleteDayId) {

        let current = {};

        let historyRows = await this.orderBookHistoryDao.selectByDayId(lastCompleteDayId);

        for (let historyRow of historyRows) {
            const {
                dappId,
                orderId,
                operationTokenId,
                counterpartTokenId,
                orderTypeId,
                totalOpenAmount,
                totalOpenOrderValue,
                totalCanceledAmount,
                totalCanceledOrderValue,
                openOrderCount,
                canceledOrderCount,
            } = historyRow;

            current[orderTypeId] = {
                dappId,
                orderId,
                operationTokenId,
                counterpartTokenId,
                orderTypeId,
                totalOpenAmount,
                totalOpenOrderValue,
                totalCanceledAmount,
                totalCanceledOrderValue,
                openOrderCount,
                canceledOrderCount,
            };

        }
        return current;

    }
}

module.exports = OrderBookHistoryLoader;