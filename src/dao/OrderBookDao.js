
const BaseBatchDao = require('./BaseBatchDao');

class OrderBookDAO extends BaseBatchDao {
    constructor(dbCon) {
        super(['orderId', 'orderTypeId'], 1);
        this.dbCon = dbCon;
    }


    _toInsertArray({
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
        placedDayId,
        placedHourOfDay,
        placedTime,
        finishedDayId,
        finishedHourOfDay,
        finishedTime,
        createdAt,

    }) {
        return [
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
            placedDayId,
            placedHourOfDay,
            placedTime,
            finishedDayId,
            finishedHourOfDay,
            finishedTime,
            createdAt,
        ];
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO order_book(
                dapp_id,
                order_id,
                account_id,
                operation_token_id,
                counterpart_token_id,
                price,
                amount,
                order_value,
                remaining_amount,
                remaining_order_value,
                order_type_id,
                order_status_id,
                placed_day_id,
                placed_hour_of_day,
                placed_time,
                finished_day_id,
                finished_hour_of_day,
                finished_time,
                created_at
            ) VALUES ?`,
            values,
            toArray);
    }

    async insert(values) {
        await this._insert(values);
    }

    async insertObj(objs) {
        await this._insert(objs, this._toInsertArray);
    }

    async _update({
        remainingAmount,
        remainingOrderValue,
        orderStatusId,
        finishedDayId,
        finishedHourOfDay,
        finishedTime,
        orderId,
        orderTypeId,
        createdAt,
    }) {

        await this.dbCon.execute(
            `UPDATE order_book 
             SET remaining_amount = ?,
                 remaining_order_value = ?,
                 order_status_id = ?,
                 finished_day_id = ?,
                 finished_hour_of_day = ?,
                 finished_time = ?
             WHERE order_id = ? AND
                   order_type_id = ? AND
                   created_at = ?`,
            [
                remainingAmount,
                remainingOrderValue,
                orderStatusId,
                finishedDayId,
                finishedHourOfDay,
                finishedTime,
                orderId,
                orderTypeId,
                createdAt
            ]
        );
    }

    async selectById(orderId, orderTypeId, createdAt) {
        return await this.dbCon.singleRow(
            `SELECT * 
            FROM order_book 
            WHERE order_id = ? and
                  order_type_id = ? and
                  created_at = ?`,
            [orderId, orderTypeId, createdAt]);
    }

}


module.exports = OrderBookDAO;