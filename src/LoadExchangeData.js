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
            parsedMemo,
        } = payload;

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
