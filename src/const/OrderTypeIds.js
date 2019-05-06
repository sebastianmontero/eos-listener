const { OrderTypes } = require('@smontero/gyftie-listener');
module.exports = {
    BUY: 1,
    BUY_LIMIT: 2,
    SELL: 3,
    SELL_LIMIT: 4,
    CANCEL: 5,
    isMarketOrder: function (marketOpTypeId) {
        return marketOpTypeId == this.BUY || marketOpTypeId == this.SELL;
    },
    getOrderTypeId: function (orderType) {
        switch (orderType) {
            case OrderTypes.BUY:
                return this.BUY;
            case OrderTypes.BUY_LIMIT:
                return this.BUY_LIMIT;
            case OrderTypes.SELL:
                return this.SELL;
            case OrderTypes.SELL_LIMIT:
                return this.SELL_LIMIT;
        }
        throw new Error(`Order Type: ${orderType} does not exist`);
    }
};