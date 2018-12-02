const EOSListener = require('./EOSListener.js');
const figlet = require('figlet');
const mysql = require('mysql');

class LoadExchangeData {
    constructor(config) {
        this.config = config;
        this.extractSymbolRegex = /^\s*(\d+.?\d*)\s*([a-zA-Z]+)\s*$/;
        const {
            eoswsToken,
            origin,
            eoswsEndpoint,
            streamOptions,
            db
        } = config;

        this.listener = new EOSListener({
            eoswsToken,
            origin,
            eoswsEndpoint,
            streamOptions
        });
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
        figlet('Load Exchange Data', {
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
    }

    start() {
        const {
            actionTraces,
            actionFilters,
            keyDictionary,
        } = this.config;

        this.printFiglet();

        this.listener.addActionTraces({
            actionTraces,
            actionFilters,
            memoJsonKeyDictionary: keyDictionary,
            callbackFn: payload => {
                const {
                    account,
                    action,
                    actionData: { to, from, quantity },
                } = payload;

                let { parsedMemo } = payload;
                this.postProcessParsedMemo(parsedMemo);
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
                        throw error;
                    }
                });
            }
        });
    }
}

module.exports = LoadExchangeData;
