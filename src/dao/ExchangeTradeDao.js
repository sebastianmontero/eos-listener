

class ExchangeTradeDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert({
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
    }) {

        return await this.dbCon.execute(`INSERT INTO exchange_trade(
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
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
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

            ]);
    }

}


module.exports = ExchangeTradeDAO;