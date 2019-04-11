const straw = require('straw');
const { AccountTypeIds, DappIds, OrderTypeIds, SpecialValues } = require('../const');
const { Util } = require('../util');
const { NOT_APPLICABLE } = SpecialValues;

module.exports = straw.node({
    process: function (msg, done) {
        const { inlineTraceResults, action, blockTime: tradeTime } = msg;
        const tradeTraces = inlineTraceResults['tradeexec'] || [];
        console.log('inlineTrades: ', JSON.stringify(tradeTraces));
        let dappId = DappIds.GYFTIE_EXCHANGE;

        for (let tradeTrace of tradeTraces) {
            const {
                data: {
                    buyer,
                    seller,
                    market_maker: marketMaker,
                    gft_amount: amount,
                    price,
                    maker_reward: makerReward
                }
            } = tradeTrace;

            let buyOrderTypeId, sellOrderTypeId;

            if (action == "marketsell") {
                buyOrderTypeId = OrderTypeIds.BUY_LIMIT;
                sellOrderTypeId = OrderTypeIds.SELL;
            } else if (action == "marketbuy") {
                buyOrderTypeId = OrderTypeIds.BUY;
                sellOrderTypeId = OrderTypeIds.SELL_LIMIT;
            } else {
                buyOrderTypeId = OrderTypeIds.BUY_LIMIT;
                sellOrderTypeId = OrderTypeIds.SELL_LIMIT;
            }

            let { amount: amountQty, symbol: amountTkn } = Util.parseAsset(amount);
            let { amount: priceQty, symbol: priceTkn } = Util.parseAsset(price);
            let { amount: marketMakerFee, symbol: marketMakerFeeToken } = Util.parseAsset(makerReward);

            this.output('trade', {
                dappId,
                buyer,
                buyerAccountTypeId: AccountTypeIds.USER,
                buyerDappId: NOT_APPLICABLE.id,
                seller,
                sellerAccountTypeId: AccountTypeIds.USER,
                sellerDappId: NOT_APPLICABLE.id,
                boughtToken: amountTkn,
                priceBought: priceQty,
                boughtAmount: amountQty,
                buyOrderTypeId,
                soldToken: priceTkn,
                priceSold: 1 / priceQty,
                soldAmount: amountQty * priceQty,
                sellOrderTypeId,
                marketMaker,
                marketMakerFee,
                marketMakerFeeToken,
                tradeTime
            });
        }
        done(false);
    },
});