
const BaseBatchDao = require('./BaseBatchDao');

class OrderBookChangeDAO extends BaseBatchDao {
    constructor(dbCon) {
        super([], 1);
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
        orderTypeId,
        dayId,
        hourOfDay,
        operationTime,
        tableOperationTypeId,
        marketOperationTypeId,
        blockNum,
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
            orderTypeId,
            dayId,
            hourOfDay,
            operationTime,
            tableOperationTypeId,
            marketOperationTypeId,
            blockNum,
            createdAt,
        ];
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO order_book_change(
                dapp_id,
                order_id,
                account_id,
                operation_token_id,
                counterpart_token_id,
                price,
                amount,
                order_value,
                order_type_id,
                day_id,
                hour_of_day,
                operation_time,
                table_operation_type_id,
                market_operation_type_id,
                block_num,
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

}


module.exports = OrderBookChangeDAO;