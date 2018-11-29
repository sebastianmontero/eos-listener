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

figlet('Load Memo Keys', {
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
            actionData: { to, memo },
            memoJson,
        } = payload;

        function updateMemoKeys(dbCon, jsonData) {
            dbCon.query("INSERT INTO memo_keys SET ? ON DUPLICATE KEY UPDATE raw_json = SUBSTRING(CONCAT(raw_json, ', ', VALUES(raw_json)),1, 2000), example_values = SUBSTRING(CONCAT(example_values, ', ', VALUES(example_values)),1, 2000)", [jsonData], function (error) {
                if (error) {
                    throw error;
                }
            });
        }

        if (memoJson) {
            for (let key in memoJson) {
                const keyValues = {
                    exchange: to,
                    memo_key: key,
                    raw_json: memo,
                    example_values: memoJson[key]
                };
                console.log(keyValues);
                updateMemoKeys(dbCon, keyValues);
            }
        } else {
            updateMemoKeys(dbCon, {
                exchange: to,
                memo_key: 'NO MEMO',
                raw_json: memo,
                example_values: ''
            });
        }
    }
});
