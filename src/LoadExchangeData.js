const figlet = require('figlet');
const mysql = require('mysql');
const EOSListener = require('./EOSListener');
const Interpreter = require('./Interpreter');
const { logger } = require('./Logger');

class LoadExchangeData {
    constructor(config) {
        this.config = config;
        this.extractSymbolRegex = /^\s*(\d+.?\d*)\s*([a-zA-Z]+)\s*$/;
        const {
            eoswsToken,
            origin,
            eoswsEndpoint,
            streamOptions,
            db,
            keyDictionary
        } = config;

        this.listener = new EOSListener({
            eoswsToken,
            origin,
            eoswsEndpoint,
            streamOptions
        });
        this.interpreter = new Interpreter(keyDictionary);
        this.dbCon = mysql.createConnection(db);
    }


    extractSymbol(value) {
        const result = this.extractSymbolRegex.exec(value);
        if (result) {
            return {
                amount: result[1],
                symbol: result[2],
            };
        }
        return null;
    }

    printFiglet() {
        figlet('Loading Exchange Data', {
            font: "Big",
            horizontalLayout: 'default',
            verticalLayout: 'default'
        }, (err, data) => {
            if (err) {
                console.log('Something went wrong...');
                console.dir(err);
                return;
            }
            console.log(data)
            console.log("");
            console.log("----- Using Configuration ---- ")
            console.log(this.config);
            console.log("----- End Configuration ---- ")
            console.log("\n\n ")

        });

    }

    postProcessParsedMemo(parsedMemo) {
        if (parsedMemo) {
            const { trade_quantity, trade_price } = parsedMemo;
            let tradeQuantity = this.extractSymbol(trade_quantity);
            let tradePrice = this.extractSymbol(trade_price);
            let symbol = null;
            if (tradeQuantity) {
                symbol = tradeQuantity.symbol;
                parsedMemo.trade_quantity = tradeQuantity.amount
            }
            if (tradePrice) {
                symbol = symbol ? symbol + '_' + tradePrice.symbol : tradePrice.symbol;
                parsedMemo.trade_price = tradePrice.amount;
            }
            if (symbol && !parsedMemo.symbol) {
                parsedMemo.symbol = symbol;
            }
        }
        return parsedMemo;
    }

    start() {
        const {
            actionTraces,
            actionFilters,
        } = this.config;

        this.printFiglet();

        try {
            this.listener.addActionTraces({
                actionTraces,
                actionFilters,
                callbackFn: payload => {
                    const {
                        account,
                        action,
                        actionData: { to, from, quantity, memo },
                    } = payload;

                    let parsedMemo = this.postProcessParsedMemo(this.interpreter.interpret(memo));
                    const toInsert = {
                        account,
                        action,
                        to,
                        from,
                        quantity,
                        ...parsedMemo
                    };
                    this.dbCon.query("INSERT INTO exchange_trades SET ?", [toInsert], (error) => {
                        if (error) {
                            logger.error('Unable to insert transfer to exchange_trades table', error);
                            throw error;
                        }
                    });
                }
            });
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = LoadExchangeData;
