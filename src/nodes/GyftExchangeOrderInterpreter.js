const straw = require('straw');
const {
    DappIds,
    OrderTypeIds,
    MarketOperationTypeIds,
    TableOperationTypeIds,
    Tokens
} = require('../const');
const { Util, TimeUtil } = require('../util');
const logger = require('../Logger').configure('exchange-order-interpreter-table-updater');

const BUY_TABLE = "gftorderbook/buyorders";
const SELL_TABLE = "gftorderbook/sellorders";

module.exports = straw.node({
    process: function (msg, done) {
        const { dbOpResults, action, actionData, blockTime: operationTime, blockNum } = msg;
        console.log('action: ', action);
        console.log('dbOpResults: ', JSON.stringify(dbOpResults));

        const operationTimeDate = new Date(operationTime);

        let extraFields = {
            dappId: DappIds.GYFTIE_EXCHANGE,
            marketOperationTypeId: MarketOperationTypeIds.getMarketOpTypeId(action),
            dayId: TimeUtil.dayId(operationTimeDate),
            hourOfDay: operationTimeDate.getUTCHours(),
            operationTime,
            blockNum,
        };

        let dbOps = this.processDBOps(BUY_TABLE, dbOpResults[BUY_TABLE], extraFields);
        dbOps = dbOps.concat(
            this.processDBOps(SELL_TABLE, dbOpResults[SELL_TABLE], extraFields)
        );
        dbOps = this.orderByType(dbOps);

        console.log('processedDBOps: ', JSON.stringify(dbOps));

        if (action == 'marketsell' || action == 'marketbuy') {
            let {
                totalAmount,
                totalOrderValue,
                avgPrice,
            } = this.getMarketOpStats(dbOps);

            let account, amount, amountAsset, orderValue, orderValueAsset, orderTypeId,
                remainingAmount, remainingOrderValue;

            if (action == 'marketsell') {
                ({ seller: account, gft_amount: amountAsset } = actionData);
                ({ amount } = Util.parseAsset(amountAsset));
                orderTypeId = OrderTypeIds.SELL;
                if (totalAmount >= amount) {
                    orderValue = totalOrderValue;
                    remainingAmount = 0;
                    remainingOrderValue = 0;
                } else {
                    orderValue = amount * avgPrice;
                    remainingAmount = amount - totalAmount;
                    remainingOrderValue = orderValue - totalOrderValue;
                }
            } else {
                ({ buyer: account, eos_amount: orderValueAsset } = actionData);
                ({ amount: orderValue } = Util.parseAsset(orderValueAsset));
                orderTypeId = OrderTypeIds.BUY;
                if (totalOrderValue >= orderValue) {
                    amount = totalAmount;
                    remainingAmount = 0;
                    remainingOrderValue = 0;
                } else {
                    amount = orderValue / avgPrice;
                    remainingAmount = amount - totalAmount;
                    remainingOrderValue = orderValue - totalOrderValue;
                }
            }
            this.output({
                orderId: operationTimeDate.getTime(),
                price: avgPrice,
                amount,
                oldAmount: null,
                operationToken: Tokens.GFT,
                counterpartToken: Tokens.EOS,
                orderValue,
                oldOrderValue: null,
                orderTypeId,
                account,
                remainingAmount,
                remainingOrderValue,
                tableOperationTypeId: TableOperationTypeIds.INSERT,
                createdAt: TimeUtil.toUnixTimestamp(operationTimeDate),
                ...extraFields
            });
        }

        for (const dbOp of dbOps) {
            this.output(dbOp);
        }

        done(false);
    },

    orderByType: function (pDBOps) {
        let inserts = [],
            updates = [],
            deletes = [];

        for (let pDBOp of pDBOps) {
            switch (pDBOp.tableOperationTypeId) {
                case TableOperationTypeIds.INSERT:
                    inserts.push(pDBOp);
                    break;
                case TableOperationTypeIds.UPDATE:
                    updates.push(pDBOp);
                    break;
                case TableOperationTypeIds.DELETE:
                    deletes.push(pDBOp);
                    break;
            }
        }
        return inserts.concat(updates).concat(deletes);
    },

    getMarketOpStats: function (pDBOps) {
        let totalOrderValue = 0,
            totalAmount = 0;
        for (let pDBOp of pDBOps) {
            const { amountChange, orderValueChange } = pDBOp;
            totalOrderValue += orderValueChange;
            totalAmount += amountChange;
        }
        return {
            totalAmount,
            totalOrderValue,
            avgPrice: totalAmount > 0 ? totalOrderValue / totalAmount : 0,
        };
    },

    processDBOps: function (table, dbOps, extraFields) {
        let processed = [];
        dbOps = dbOps || [];
        extraFields = extraFields || {};
        for (let dbOp of dbOps) {
            let result = this.processDBOp(table, dbOp);
            console.log('pDBOp:', result);
            processed.push({
                ...result,
                ...extraFields
            });
        }
        return processed;
    },

    processDBOp: function (table, dbOp) {
        const { op, old: oldData, new: newData } = dbOp;

        let result = this.processDBData(table, oldData, newData);
        result.tableOperationTypeId = TableOperationTypeIds.getTableOp(op);
        return result;
    },

    processDBData: function (table, oldData, newData) {

        const data = newData || oldData;
        const {
            order_id: orderId,
            price_per_gft: priceAsset,
            gft_amount: amountAsset,
            order_value: orderValueAsset,
            created_date: createdAt,
        } = data;

        let orderTypeId, account;
        if (table == BUY_TABLE) {
            orderTypeId = OrderTypeIds.BUY_LIMIT;
            account = data.buyer;
        } else {
            orderTypeId = OrderTypeIds.SELL_LIMIT;
            account = data.seller;
        }

        let { amount: price } = Util.parseAsset(priceAsset);
        let { amount, symbol: operationToken } = Util.parseAsset(amountAsset);
        let { amount: orderValue, symbol: counterpartToken } = Util.parseAsset(orderValueAsset);

        let amountChange = 0,
            orderValueChange = 0,
            oldAmount = null,
            oldOrderValue = null;
        if (oldData && newData) {
            const {
                gft_amount: oldAmountAsset,
                order_value: oldOrderValueAsset,
            } = oldData;
            ({ amount: oldAmount } = Util.parseAsset(oldAmountAsset));
            ({ amount: oldOrderValue } = Util.parseAsset(oldOrderValueAsset));
            amountChange = oldAmount - amount;
            orderValueChange = oldOrderValue - orderValue;
        } else if (oldData) {
            amountChange = amount;
            orderValueChange = orderValue;
        }

        return {
            orderId,
            price,
            amount,
            oldAmount,
            operationToken,
            counterpartToken,
            orderValue,
            oldOrderValue,
            orderTypeId,
            account,
            amountChange,
            orderValueChange,
            createdAt,
        };
    },
});