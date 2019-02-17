const BaseBatchDao = require('./BaseBatchDao');

class ExchangeTradeDAO extends BaseBatchDao {
    constructor(dbCon) {
        super([], 150);
        this.dbCon = dbCon;
    }


    _toInsertArray({
        tokenAccountId,
        actionId,
        fromAccountId,
        toAccountId,
        quantity,
        quantityTokenId,
        orderTypeId,
        quoteTokenId,
        baseTokenId,
        tradeQuantity,
        tradePrice,
        channelId,
        dayId,
        hourOfDay,
        blockTime,

    }) {
        return [
            tokenAccountId,
            actionId,
            fromAccountId,
            toAccountId,
            quantity,
            quantityTokenId,
            orderTypeId,
            quoteTokenId,
            baseTokenId,
            tradeQuantity,
            tradePrice,
            channelId,
            dayId,
            hourOfDay,
            blockTime
        ];
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO exchange_trade(
                token_account_id,
                action_id,
                from_account_id,
                to_account_id,
                quantity,
                quantity_token_id,
                order_type_id,
                quote_token_id,
                base_token_id,
                trade_quantity,
                trade_price,
                channel_id,
                day_id,
                hour_of_day,
                block_time
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


module.exports = ExchangeTradeDAO;