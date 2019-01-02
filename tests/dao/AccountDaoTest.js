const expect = require('chai').expect
const mysql = require('mysql2/promise');
const { AccountDao } = require('../../src/dao');
process.env["NODE_CONFIG_DIR"] = __dirname + "/../config";
console.log(process.env["NODE_CONFIG_DIR"]);
const config = require('config');

describe('getAccountId', function () {
    let dbCon = null;
    before(async function () {
        const { db } = config;
        dbCon = await mysql.createConnection(db);
    });

    after(async function () {
        await dbCon.end();
    });
    it('Insert and update', async function () {
        const accountDao = new AccountDao(dbCon);
        await accountDao.deleteByNaturalPK('testacCount');
        let id = await accountDao.getAccountId('testaccount', 1, -1);
        expect(id).to.exist
        let account = await accountDao.selectById(id);
        validateAccount(account, 'testaccount', 1, -1);
        id = await accountDao.getAccountId('testaccount', 1, 1);
        expect(id).to.exist
        account = await accountDao.selectById(id);
        validateAccount(account, 'testaccount', 1, 1);
        await accountDao.deleteByNaturalPK('testacCount');
    });

});


function validateAccount(account, accountName, accountTypeId, dappId) {
    expect(account).to.exist
    const { account_name, account_type_id, dapp_id } = account;
    expect(account_name).to.equal(accountName);
    expect(account_type_id).to.equal(accountTypeId);
    expect(dapp_id).to.equal(dappId);
}