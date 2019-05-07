
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
        actionSeq,
        operationSeq,

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
            actionSeq,
            operationSeq,
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
                old_amount,
                old_order_value,
                order_type_id,
                day_id,
                hour_of_day,
                operation_time,
                table_operation_type_id,
                market_operation_type_id,
                block_num,
                created_at,
                action_seq,
                operation_seq
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

    async selectPrevOrdersMatch() {
        return await this.dbCon.execute(
            `select o1.order_book_change_id orderBookChangeId,
                    o1.order_id orderId,
                    o1.order_type_id orderTypeId,
                    o1.created_at createdAt,
                    o1.table_operation_type_id tableOperationTypeId,
                    o1.operation_time operationTime,
                    o1.order_value orderValue,
                    o1.amount,
                    o2.table_operation_type_id prevTableOperationTypeId,
                    o2.operation_time prevOperationTime,
                    o2.order_value oldOrderValue,
                    o2.amount oldAmount
            from order_book_change o1 inner join
                    order_book_change o2 on o1.order_id = o2.order_id and
                                            o1.order_type_id = o2.order_type_id and
                                            o1.created_at = o2.created_at and
                                            o1.amount <= o2.amount and
                                            o1.operation_time >= o2.operation_time and
                                            o1.table_operation_type_id = 2 and
                                            o1.old_amount IS NULL
            order by o1.order_id,
                        o1.order_type_id,
                        o1.created_at,
                        o1.operation_time asc,
                        o2.operation_time desc`);
    }


    async selectOrdersWithMissingInsert() {
        return await this.dbCon.execute(
            `select     o1.order_book_change_id orderBookChangeId,
                        o1.dapp_id dappId,
                        o1.order_id orderId,
                        o1.account_id accountId,
                        o1.operation_token_id operationTokenId,
                        o1.counterpart_token_id counterpartTokenId,
                        o1.price,
                        o1.amount,
                        o1.order_value orderValue,
                        o1.old_amount oldAmount,
                        o1.old_order_value oldOrderValue,
                        o1.order_type_id orderTypeId,
                        o1.day_id dayId,
                        o1.hour_of_day hourOfDay,
                        o1.operation_time operationTime,
                        o1.table_operation_type_id tableOperationTypeId,
                        o1.market_operation_type_id marketOperationTypeId,
                        o1.block_num blockNum,
                        o1.created_at createdAt
            from order_book_change o1 left join
                 order_book_change o2 on o1.order_id = o2.order_id and
                                        o1.order_type_id = o2.order_type_id and
                                        o1.created_at = o2.created_at and
                                        o2.table_operation_type_id = 1
            where o2.order_type_id IS NULL
            order by o1.order_id,
                        o1.order_type_id,
                        o1.created_at,
                        o1.operation_time asc,
                    o1.amount desc`);
    }


    async updateOldValues({
        oldAmount,
        oldOrderValue,
        orderBookChangeId,
    }) {

        await this.dbCon.execute(
            `UPDATE order_book_change 
             SET old_amount = ?,
                 old_order_value = ?
             WHERE order_book_change_id = ?`,
            [
                oldAmount,
                oldOrderValue,
                orderBookChangeId
            ]
        );
    }

    async selectFrom(dayId) {
        let condition = '';
        let params = [];
        if (dayId) {
            condition = 'where day_id >= ?';
            params.push(dayId);
        }
        return await this.dbCon.execute(
            `select  order_book_change_id orderBookChangeId,
                    dapp_id dappId,
                    order_id orderId,
                    account_id accountId,
                    operation_token_id operationTokenId,
                    counterpart_token_id counterpartTokenId,
                    price,
                    amount,
                    order_value orderValue,
                    old_amount oldAmount,
                    old_order_value oldOrderValue,
                    order_type_id orderTypeId,
                    day_id dayId,
                    hour_of_day hourOfDay,
                    operation_time operationTime,
                    table_operation_type_id tableOperationTypeId,
                    market_operation_type_id marketOperationTypeId,
                    block_num blockNum,
                    created_at createdAt,
                    action_seq actionSeq,
                    operation_seq operationSeq,
            from order_book_change
            ${condition}
            order by operation_time asc,
                     amount desc,
                     order_book_change_id asc`,
            params);
    }

}


module.exports = OrderBookChangeDAO;