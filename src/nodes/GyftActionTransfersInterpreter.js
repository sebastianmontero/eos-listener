const straw = require('straw');
const { AccountTypeIds, DappIds, TransferTypeIds, GyftieAccounts, SpecialValues } = require('../const');
const { Util } = require('../util');
const { UNKNOWN, NOT_APPLICABLE } = SpecialValues;

module.exports = straw.node({
    process: function (msg, done) {
        const { inlineTraceResults, blockTime: transferTime } = msg;
        const transferTraces = inlineTraceResults['issue-transfers'];
        let transfers = [];
        let gyft = {
            foundationReward: 0,
            liquidityReward: 0,
            eosAccountCreationReimbursement: 0,
            gyfterReward: 0,
            gyfteeReward: 0,
            gyftTime: transferTime,
        };
        let toAccountTypeId, toDappId;

        for (let transferTrace of transferTraces) {
            const { data: { from, to, quantity: quantityAsset, memo } } = transferTrace;
            let lcMemo = memo.toLowerCase();
            let transferTypeId = UNKNOWN.id;
            let { amount: quantity, symbol: quantitySymbol } = Util.parseAsset(quantityAsset);
            if (to == GyftieAccounts.FOUNDATION) {
                transferTypeId = TransferTypeIds.GYFT_EVENT;
                toAccountTypeId = AccountTypeIds.USER;
                toDappId = NOT_APPLICABLE.id;
                gyft.foundationReward = quantity;
            } else if (to == GyftieAccounts.ORDER_BOOK) {
                if (lcMemo.indexOf('liquidity') != -1) {
                    transferTypeId = TransferTypeIds.LIQUIDITY_REWARD;
                    gyft.liquidityReward = quantity;
                } else if (lcMemo.indexOf('reimbursement') != -1) {
                    transferTypeId = TransferTypeIds.EOS_ACCOUNT_CREATION_REIMBURSEMENT;
                    gyft.eosAccountCreationReimbursement = quantity;
                }
                toAccountTypeId = AccountTypeIds.DAPP;
                toDappId = DappIds.GYFTIE_TOKEN;
            } else {
                if (lcMemo.indexOf('gyfter') != -1) {
                    transferTypeId = TransferTypeIds.GYFTER;
                    gyft.gyfter = to;
                    gyft.gyfterReward = quantity;
                } else /* if (lcMemo.indexOf('new') != -1) */ {
                    transferTypeId = TransferTypeIds.GYFTEE;
                    gyft.gyftee = to;
                    gyft.gyfteeReward = quantity;
                }
                toAccountTypeId = AccountTypeIds.USER;
                toDappId = NOT_APPLICABLE.id;
            }
            transfers.push({
                dappId: DappIds.GYFTIE_TOKEN,
                from,
                fromAccountTypeId: AccountTypeIds.DAPP,
                fromDappId: DappIds.GYFTIE_TOKEN,
                to,
                toAccountTypeId,
                toDappId,
                quantity,
                quantitySymbol,
                transferTypeId,
                transferTime
            });
        }
        for (let transfer of transfers) {
            transfer.gyfter = gyft.gyfter;
            this.output('transfer', transfer);
        }
        console.log(gyft);
        this.output('gyft', gyft);
        done(false);
    },
});