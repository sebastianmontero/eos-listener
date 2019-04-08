const straw = require('straw');
const { DBOps, ForkSteps } = require('../const');
const { InboundMessageType } = require('@dfuse/eosws-js');

module.exports = straw.node({
    process: function (msg, done) {
        console.log(JSON.stringify(msg));
        console.log(JSON.stringify(msg.dbOpResults));
        //console.log(msg);

        done(false);
    }
});