
const expect = require('chai').expect
const DBCon = require('../../src/db/DBConnection');
const { AccountDao, VoterDao } = require('../../src/dao');
process.env["NODE_CONFIG_DIR"] = __dirname + "/../config";
console.log(process.env["NODE_CONFIG_DIR"]);
const config = require('config');

describe('insert', function () {
    let dbCon = null;
    let voterDao = null;
    let accountDao = null;
    before(async function () {
        const { db } = config;
        dbCon = await DBCon.createConnection(db);
        voterDao = new VoterDao(dbCon);
        accountDao = new AccountDao(dbCon);
    });

    after(async function () {
        await dbCon.end();
    });
    it('Insert', async function () {

        let id = await accountDao.getAccountId('testaccount1', 1, -1);
        expect(id).to.exist
        await voterDao.insert([id, false]);
        await voterDao.delete(id);
        await accountDao.deleteByNaturalPK('testacCount1');
    });

});