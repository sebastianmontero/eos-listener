const expect = require('chai').expect
const mysql = require('mysql2/promise');
const mysqlb = require('mysql2');
const { AccountDao } = require('../../src/dao');
process.env["NODE_CONFIG_DIR"] = __dirname + "/../config";
console.log(process.env["NODE_CONFIG_DIR"]);
const config = require('config');

describe('getAccountId', function () {
    let dbCon = null;
    let dbConb = null;
    let accountDao = null;
    let accountDaob = null;
    before(async function () {
        const { db } = config;
        dbCon = await mysql.createConnection(db);
        dbConb = mysqlb.createConnection(db);
        accountDao = new AccountDao(dbCon);
        accountDaob = new AccountDao(dbConb);
    });

    after(async function () {
        await dbCon.end();
        dbConb.end();
    });
    it('Insert and update', async function () {
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

    it('Test stream', async function () {
        const query = accountDaob.selectStream();
        console.log(query);
        query
            .on('error', function (err) {
                console.log('Error:', err);
            })
            .on('fields', function (fields) {
                console.log('Fields:', fields);
            })
            .on('result', function (row) {
                console.log('Row:', row);
                if (row.account_id == 148403) {
                    dbConb.pause();
                    console.log('--paused--');
                    setTimeout(function () {
                        dbConb.continue();
                    }, 5000);
                }
            })
            .on('end', function () {
                console.log('All rows have been processed');
            });
    });


});


function validateAccount(account, accountName, accountTypeId, dappId) {
    expect(account).to.exist
    const { account_name, account_type_id, dapp_id } = account;
    expect(account_name).to.equal(accountName);
    expect(account_type_id).to.equal(accountTypeId);
    expect(dapp_id).to.equal(dappId);
}