const straw = require('@smontero/straw');
const { ExchangeTradeInterpreter } = require('@smontero/gyftie-listener');
const { AccountTypeIds, DappIds, OrderTypeIds, SpecialValues } = require('../const');
const { NOT_APPLICABLE } = SpecialValues;

module.exports = straw.node({
    initialize(opts, done) {
        this.interpreter = new ExchangeTradeInterpreter();
        done();
    },
    process: function (msg, done) {

        const trade = this.interpreter.interpret(msg);

        const {
            buyOrderType,
            sellOrderType,
        } = trade;

        this.output('trade', {
            ...trade,
            dappId: DappIds.GYFTIE_EXCHANGE,
            buyerAccountTypeId: AccountTypeIds.USER,
            buyerDappId: NOT_APPLICABLE.id,
            sellerAccountTypeId: AccountTypeIds.USER,
            sellerDappId: NOT_APPLICABLE.id,
            buyOrderTypeId: OrderTypeIds.getOrderTypeId(buyOrderType),
            sellOrderTypeId: OrderTypeIds.getOrderTypeId(sellOrderType),
        });

        done(false);
    },
});