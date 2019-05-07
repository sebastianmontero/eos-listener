const straw = require('straw');
const { GyftEventInterpreter, GyftieAccounts } = require('@smontero/gyftie-listener');
const { AccountTypeIds, DappIds, TransferTypeIds, SpecialValues } = require('../const');
const { NOT_APPLICABLE } = SpecialValues;

module.exports = straw.node({
    initialize(opts, done) {
        this.interpreter = new GyftEventInterpreter();
        done();
    },
    process: function (msg, done) {
        const { gyft, transfers } = this.interpreter.interpret(msg);

        for (let transfer of transfers) {

            let toAccountTypeId = AccountTypeIds.USER;
            let toDappId = NOT_APPLICABLE.id;
            const { to, transferType } = transfer;
            if (to === GyftieAccounts.ORDER_BOOK) {
                toAccountTypeId = AccountTypeIds.DAPP;
                toDappId = DappIds.GYFTIE_TOKEN;
            }
            this.output('transfer', {
                dappId: DappIds.GYFTIE_TOKEN,
                fromAccountTypeId: AccountTypeIds.DAPP,
                fromDappId: DappIds.GYFTIE_TOKEN,
                toAccountTypeId,
                toDappId,
                transferTypeId: TransferTypeIds.getTransferTypeId(transferType),
                ...transfer
            });
        }
        console.log(gyft);
        this.output('gyft', gyft);
        done(false);
    },
});