const expect = require('chai').expect
const mysql = require('mysql2/promise');
const { AccountDao } = require('../../src/dao');
process.env["NODE_CONFIG_DIR"] = __dirname + "/../config";
console.log(process.env["NODE_CONFIG_DIR"]);
const config = require('config');

describe('getAccountId', function () {
    it('Insert and update', async function () {
        const { db } = config;
        console.log(db);
        const dbCon = await mysql.createConnection(db);
        const accountDao = new AccountDao(dbCon);
        await accountDao.deleteByNaturalPK('testacCount');
        let id = await accountDao.getAccountId('testaccount', 1, -1);
        console.log(id);
        id = await accountDao.getAccountId('testaccount', 1, 1);
        console.log(id);
        await accountDao.deleteByNaturalPK('testacCount');
        await dbCon.end();
    });

});