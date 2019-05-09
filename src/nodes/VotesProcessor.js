const straw = require('@smontero/straw');
const { DBOps, ForkSteps } = require('../const');
const { InboundMessageType } = require('@dfuse/eosws-js');

module.exports = straw.node({
    initialize: async function (opts, done) {
        console.log(opts);
        done();
    },
    process: function (msg, done) {
        const { action, dbOpResults } = msg;
        console.log(JSON.stringify(msg));
        //console.log(JSON.stringify(msg.dbOpResults));
        //console.log(JSON.stringify(action));
        //console.log(JSON.stringify(dbOpResults));
        //console.log(msg);

        done(false);
    },
    stop: function (done) {
        done(false);
    }
});