module.exports = {
    BUY_LIMIT: 1,
    SELL_LIMIT: 2,
    BUY: 3,
    SELL: 4,
    DELETE: 5,
    LIMIT: 6,
    getMarketOpTypeId: function (action) {
        switch (action) {
            case 'delbuyorder':
                return this.DELETE;
            case 'sellbuyorder':
                return this.DELETE;
            case 'limitsellgft':
                return this.SELL_LIMIT;
            case 'stacksellrec':
                return this.SELL_LIMIT;
            case 'limitbuygft':
                return this.BUY_LIMIT;
            case 'stackbuyrec':
                return this.BUY_LIMIT;
            case 'marketsell':
                return this.SELL;
            case 'marketbuy':
                return this.BUY;
            default:
                return this.LIMIT;

        }
    },
    isMarketOrder: function (marketOpTypeId) {
        return marketOpTypeId == this.BUY || marketOpTypeId == this.SELL;
    }
};