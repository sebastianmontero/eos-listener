const straw = require('straw');
const { ExchangeOrderInterpreter } = require('@smontero/gyftie-listener');
const logger = require('../Logger').configure('exchange-order-interpreter-table-updater');


module.exports = straw.node({

    initialize(opts, done) {
        this.interpreter = new ExchangeOrderInterpreter();
        done();
    },
    process: function (msg, done) {
        const orderChanges = this.interpreter.interpret(msg, true);
        for (const orderChange of orderChanges) {
            this.output(orderChange);
        }
        done(false);
    },
});