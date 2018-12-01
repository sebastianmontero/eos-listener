const EOSListener = require('./EOSListener.js');
const figlet = require('figlet');
const config = require('config');
const mysql = require('mysql');

const {
    eoswsToken,
    origin,
    actionTraces,
    actionFilters,
    eoswsEndpoint,
    keyDictionary,
    db
} = config;

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
    console.log(config);
    console.log("----- End Configuration ---- ")
    console.log("\n\n ")

    console.log("Listening on EOS for: ");
    console.log("  Action Traces       :   ", actionTraces);
    console.log("  Action Filters      :   ", actionFilters);

});

const extractSymbolRegex = /^\s*(\d+.?\d*)\s*([a-zA-Z]+)\s*$/;

function extractSymbol(value) {
    const result = extractSymbolRegex.exec(value);
    if (result) {
        return {
            amount: result[1],
            symbol: result[2],
        };
    }
    return null;
}

const listener = new EOSListener({
    eoswsToken,
    origin,
    eoswsEndpoint,
});

const dbCon = mysql.createConnection(db);

listener.addActionTraces({
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

        if (parsedMemo) {
            const { trade_quantity, trade_price } = parsedMemo;
            let tradeQuantity = extractSymbol(trade_quantity);
            let tradePrice = extractSymbol(trade_price);
            let symbol = null;
            if (tradeQuantity) {
                symbol = tradeQuantity[2];
                parsedMemo.trade_quantity = tradeQuantity[1]
            }
            if (tradePrice) {
                symbol = symbol ? symbol + '_' + tradePrice[2] : tradePrice[2];
                parsedMemo.trade_price = tradePrice[1]
            }
            if (!parsedMemo.symbol) {
                parsedMemo.symbol = symbol;
            }
        }

        const toInsert = {
            account,
            action,
            to,
            from,
            quantity,
            ...parsedMemo
        };
        dbCon.query("INSERT INTO exchange_trades SET ?", [toInsert], (error) => {
            if (error) {
                throw error;
            }
        });
    }
});
