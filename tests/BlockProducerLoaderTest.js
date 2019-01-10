const expect = require('chai').expect
const DBCon = require('../src/db/DBConnection');
const { BlockProducerHistoryDao } = require('../src/dao');
const BlockProducerLoader = require('../src/BlockProducerLoader');
process.env["NODE_CONFIG_DIR"] = __dirname + "/../config";
console.log(process.env["NODE_CONFIG_DIR"]);
const config = require('config');

describe('takeSnapshot', function () {
    let dbCon = null;
    let blockProducerHistoryDao = null;
    let blockProducerLoader = null;

    before(async function () {
        const { db } = config;
        dbCon = await DBCon.createConnection(db);
        blockProducerLoader = new BlockProducerLoader(config);
        blockProducerHistoryDao = new BlockProducerHistoryDao(dbCon);
    });

    after(async function () {
        await dbCon.end();
    });

    it('takeSnapshot', async function () {
        await blockProducerLoader.takeSnapshot(blockProducerHistoryDao);
    });

});
