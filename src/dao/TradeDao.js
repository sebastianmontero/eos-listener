
const BaseBatchDao = require('./BaseBatchDao');

class TradeDAO extends BaseBatchDao {
    constructor(dbCon) {
        super([], 1);
        this.dbCon = dbCon;
    }


    _toInsertArray({
        dappId,
        buyerAccountId,
        sellerAccountId,
        boughtTokenId,
        priceBought,
        boughtAmount,
        buyOrderTypeId,
        soldTokenId,
        priceSold,
        soldAmount,
        sellOrderTypeId,
        dayId,
        hourOfDay,
        tradeTime,
        marketMakerAccountId,
        marketMakerFee,
        marketMakerFeeTokenId,

    }) {
        return [
            dappId,
            buyerAccountId,
            sellerAccountId,
            boughtTokenId,
            priceBought,
            boughtAmount,
            buyOrderTypeId,
            soldTokenId,
            priceSold,
            soldAmount,
            sellOrderTypeId,
            dayId,
            hourOfDay,
            tradeTime,
            marketMakerAccountId,
            marketMakerFee,
            marketMakerFeeTokenId,
        ];
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO trade(
                dapp_id,
                buyer_account_id,
                seller_account_id,
                bought_token_id,
                price_bought,
                bought_amount,
                buy_order_type_id,
                sold_token_id,
                price_sold,
                sold_amount,
                sell_order_type_id,
                day_id,
                hour_of_day,
                trade_time,
                market_maker_account_id,
                market_maker_fee,
                market_maker_fee_token_id
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


module.exports = TradeDAO;