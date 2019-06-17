const straw = require('@smontero/straw');
const Interpreter = require('../Interpreter');
const { Util } = require('../util');
const logger = require('../Logger').configure('exchange-trade-interpreter');


module.exports = straw.node({
    initialize(opts, done) {
        this.interpreter = new Interpreter(opts.config.keyDictionary);
        done();
    },
    process: function (msg, done) {
        const {
            actionData: {
                seq: actionSeq,
                account: tokenAccount,
                name: action,
                json: {
                    to,
                    from,
                    quantity,
                    memo,
                },
            },
            blockTime: tradeTime,
            blockNum,
            cursor,
            undo
        } = msg;


        const {
            tradePrice,
            tradeQuantity,
            orderType,
            channel,
            pair
        } = this._postProcessParsedMemo(this.interpreter.interpret(memo));


        this.output({
            blockNum,
            actionSeq,
            cursor,
            undo,
            tokenAccount,
            action,
            to,
            from,
            quantity,
            tradePrice,
            tradeQuantity,
            orderType,
            channel,
            pair,
            tradeTime,
        });

        done(false);
    },

    _postProcessParsedMemo(parsedMemo) {
        if (parsedMemo) {
            let { tradeQuantity, tradePrice } = parsedMemo;
            tradeQuantity = Util.parseAsset(tradeQuantity);
            tradePrice = Util.parseAsset(tradePrice);
            let pair = null;
            if (tradeQuantity) {
                pair = tradeQuantity.symbol;
                parsedMemo.tradeQuantity = tradeQuantity.amount
            }
            if (tradePrice) {
                let symbol = tradePrice.symbol;
                if (pair) {
                    if (pair.toUpperCase() == 'EOS') {
                        pair = `${symbol}_${pair}`;
                    } else {
                        pair = `${pair}_${symbol}`;
                    }
                } else {
                    pair = symbol;
                }
                parsedMemo.tradePrice = tradePrice.amount;
            }
            if (pair && !parsedMemo.pair) {
                parsedMemo.pair = pair;
            }
        } else {
            parsedMemo = {
                tradePrice: null,
                tradeQuantity: null,
            };
        }
        return parsedMemo;
    },
});