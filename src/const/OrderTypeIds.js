module.exports = {
    BUY: 1,
    BUY_LIMIT: 2,
    SELL: 3,
    SELL_LIMIT: 4,
    CANCEL: 5,
    isMarketOrder: function (marketOpTypeId) {
        return marketOpTypeId == this.BUY || marketOpTypeId == this.SELL;
    }
};