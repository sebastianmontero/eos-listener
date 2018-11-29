var { EoswsClient, createEoswsSocket, InboundMessageType } = require('@dfuse/eosws-js');

var WebSocket = require('ws');
var axios = require('axios');
var figlet = require('figlet');
var config = require('config');
var mysql = require('mysql');

const {
    eoswsToken,
    origin,
    actionTraces,
    actionFilters,
    eoswsEndpoint,
    keyDictionary,
    db
} = config;

const client = new EoswsClient(createEoswsSocket(() =>
    new WebSocket(`wss://${eoswsEndpoint}/v1/stream?token=${eoswsToken}`, { origin })))


function extractJson(memo) {
    let memoJson = memo.substring(memo.indexOf('{'), memo.lastIndexOf('}') + 1);
    memoJson = memoJson.replace(/'/g, '"');
    return memoJson;
}

function readMemoJson(memoJson) {
    let readData = {};
    for (let property in keyDictionary) {
        const { colName, keys } = keyDictionary[property];
        readData[colName] = readMemoKey(keys, memoJson);
    }
    return readData;
}

function readMemoKey(keys, memoJson) {
    for (key of keys) {
        if (key in memoJson) {
            return memoJson[key];
        }
    }
    return null;
}

figlet('EOS Listener', {
    font: "Big",
    horizontalLayout: 'default',
    verticalLayout: 'default'
}, function (err, data) {
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


// {"type":"sell-limit","symbol":"MEETONE_EOS","price":"0.000431","count":"11571.5222","amount":4.9873,"channel":"meetone"}
// {"type":"buy","quantity":"9445.8328","price":"0.00012575","code":"eosadddddddd","symbol":"ADD"}

const dbCon = mysql.createConnection(db);

client.connect().then(() => {
    actionTraces.forEach(actionTrace => {
        client.getActionTraces(actionTrace/*, { start_block: -10000 }*/).onMessage((message) => {
            if (message.type === InboundMessageType.ACTION_TRACE) {
                var data = message.data.trace.act;
                var payload = {};
                payload.account = data.account;
                payload.action = data.name;
                payload.from = data.data.from;
                payload.to = data.data.to;
                payload.quantity = data.data.quantity;

                let actionData = data.data;
                let actionName = data.name;
                let passFilter = true;
                if (actionName in actionFilters) {
                    const filter = actionFilters[actionName];
                    for (filterKey in filter) {
                        const filterValues = Array.isArray(filter[filterKey]) ? filter[filterKey] : [filter[filterKey]];
                        if (filterValues.indexOf(actionData[filterKey]) == -1) {
                            passFilter = false;
                        }
                    }
                }

                if (passFilter) {
                    console.log(" MEMO: ", data.data.memo);
                    let memo = extractJson(data.data.memo);

                    if (memo.length == 0) {
                        payload = {
                            ...payload,
                            ordertype: null,
                            pair: null,
                            trade_quantity: null,
                            trade_price: null,
                            channel: null
                        }
                    } else {
                        const trade_data = JSON.parse(memo);
                        payload = {
                            ...payload,
                            ...readMemoJson(trade_data)
                        }
                    }

                    console.log(" PAYLOAD: ", payload);
                    dbCon.query("INSERT INTO exchange_trades SET ?", [payload], function (error) {
                        if (error) {
                            throw error;
                        }
                    });
                }
            }
        })
    })
}).catch((error) => {
    console.log('Unable to connect to dfuse endpoint.', error)
});





