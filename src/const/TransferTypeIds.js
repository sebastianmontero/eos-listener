const { TransferTypes } = require('@smontero/gyftie-listener');

module.exports = {
    CHALLENGEE: 1,
    VALIDATOR: 2,
    GYFTER: 3,
    GYFTEE: 4,
    GYFT_EVENT: 5,
    LIQUIDITY_REWARD: 6,
    EXCHANGE_WITHDRAW: 7,
    EXCHANGE_TRADE: 8,
    MARKET_MAKER_FEE: 9,
    EOS_ACCOUNT_CREATION_REIMBURSEMENT: 10,
    GYFTER_TO_GYFTEE: 11,
    getTransferTypeId: function (transferType) {
        switch (transferType) {
            case TransferTypes.CHALLENGEE:
                return this.CHALLENGEE;
            case TransferTypes.VALIDATOR:
                return this.VALIDATOR;
            case TransferTypes.GYFTER:
                return this.GYFTER;
            case TransferTypes.GYFTEE:
                return this.GYFTEE;
            case TransferTypes.GYFT_EVENT:
                return this.GYFT_EVENT;
            case TransferTypes.LIQUIDITY_REWARD:
                return this.LIQUIDITY_REWARD;
            case TransferTypes.EXCHANGE_WITHDRAW:
                return this.EXCHANGE_WITHDRAW;
            case TransferTypes.EXCHANGE_TRADE:
                return this.EXCHANGE_TRADE;
            case TransferTypes.MARKET_MAKER_FEE:
                return this.MARKET_MAKER_FEE;
            case TransferTypes.EOS_ACCOUNT_CREATION_REIMBURSEMENT:
                return this.EOS_ACCOUNT_CREATION_REIMBURSEMENT;
            case TransferTypes.GYFTER_TO_GYFTEE:
                return this.GYFTER_TO_GYFTEE;
        }
        throw new Error(`Transfer Type: ${transferType} does not exist`);
    }
};