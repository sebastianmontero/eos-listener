const EOSListener = require('./eos-listener/EOSListener.js');
const figlet = require('figlet');
const mysql = require('mysql');
const JSONFieldParser = require('./JSONFieldParser');
const { logger } = require('./Logger');

class LoadMemoKeys {
    constructor(config) {
        this.config = config;
        const {
            eoswsToken,
            origin,
            eoswsEndpoint,
            streamOptions,
            db,
        } = config;

        this.listener = new EOSListener({
            eoswsToken,
            origin,
            eoswsEndpoint,
            streamOptions
        });
        this.parser = new JSONFieldParser();
        this.dbCon = mysql.createConnection(db);
    }

    printFiglet() {
        figlet('Loading Memo Keys', {
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

    updateMemoKeys(jsonData) {
        this.dbCon.query("INSERT INTO memo_keys SET ? ON DUPLICATE KEY UPDATE raw_json = SUBSTRING(CONCAT(raw_json, ', ', VALUES(raw_json)),1, 2000), example_values = SUBSTRING(CONCAT(example_values, ', ', VALUES(example_values)),1, 2000)", [jsonData], function (error) {
            if (error) {
                logger.error(error);
            }
        });
    }

    start() {
        this.printFiglet();
        const {
            actionTraces,
            actionFilters,
        } = this.config;
        this.listener.addActionTraces({
            actionTraces,
            actionFilters,
            callbackFn: payload => {
                const {
                    actionData: { to, memo },
                } = payload;
                const memoJson = this.parser.parse(memo);
                if (memoJson) {
                    for (let key in memoJson) {
                        const keyValues = {
                            exchange: to,
                            memo_key: key,
                            raw_json: memo,
                            example_values: memoJson[key]
                        };
                        logger.debug('KeyValues', keyValues);
                        this.updateMemoKeys(keyValues);
                    }
                } else {
                    this.updateMemoKeys({
                        exchange: to,
                        memo_key: 'NO MEMO',
                        raw_json: memo,
                        example_values: ''
                    });
                }
            }
        });

    }
}
module.exports = LoadMemoKeys;
