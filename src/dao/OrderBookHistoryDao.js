
const BaseBatchDao = require('./BaseBatchDao');

class OrderBookHistoryDAO extends BaseBatchDao {
    constructor(dbCon) {
        super([], 1);
        this.dbCon = dbCon;
    }


    _toInsertArray({
        dappId,
        dayId,
        operationTokenId,
        counterpartTokenId,
        orderTypeId,
        totalOpenAmount,
        totalOpenOrderValue,
        totalCanceledAmount,
        totalCanceledOrderValue,
        openOrderCount,
        canceledOrderCount,

    }) {
        return [
            dappId,
            dayId,
            operationTokenId,
            counterpartTokenId,
            orderTypeId,
            totalOpenAmount,
            totalOpenOrderValue,
            totalCanceledAmount,
            totalCanceledOrderValue,
            openOrderCount,
            canceledOrderCount,
        ];
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO order_book_history(
                dapp_id,
                day_id,
                operation_token_id,
                counterpart_token_id,
                order_type_id,
                total_open_amount,
                total_open_order_value,
                total_canceled_amount,
                total_canceled_order_value,
                open_order_count,
                canceled_order_count
            ) VALUES ?
            ON DUPLICATE KEY UPDATE total_open_amount = VALUES(total_open_amount),
                                    total_open_order_value = VALUES(total_open_order_value),
                                    total_canceled_amount = VALUES(total_canceled_amount),
                                    total_canceled_order_value = VALUES(total_canceled_order_value),
                                    open_order_count = VALUES(open_order_count),
                                    canceled_order_count = VALUES(canceled_order_count)`,
            values,
            toArray);
    }

    async insert(values) {
        await this._insert(values);
    }

    async insertObj(objs) {
        await this._insert(objs, this._toInsertArray);
    }

    async selectLastCompleteDayId() {
        return await this.dbCon.singleRow(
            `SELECT  distinct day_id dayId
            FROM order_book_history
            ORDER BY day_id desc
            LIMIT 1, 1`);
    }

    async selectByDayId(dayId) {
        return await this.dbCon.singleRow(
            `SELECT dapp_id dappId,
                    day_id dayId,
                    operation_token_id operationTokenId,
                    counterpart_token_id counterpartTokenId,
                    order_type_id orderTypeId,
                    total_open_amount totalOpenAmount,
                    total_open_order_value totalOpenOrderValue,
                    total_canceled_amount totalCanceledAmount,
                    total_canceled_order_value totalCanceledOrderValue,
                    open_order_count openOrderCount,
                    canceled_order_count canceledOrderCount
            FROM order_book_history
            WHERE day_id = ?`,
            [dayId]);
    }

}


module.exports = OrderBookHistoryDAO;