const BaseDao = require('./BaseDao');


class AccountDAO extends BaseDao {
    constructor(dbCon, dbConStream) {
        super(dbCon, 'account_id');
        this.dbConStream = dbConStream;
    }

    async selectAccountId(accountName) {
        return await this._selectId({ accountName });
    }

    async _selectId({ accountName }) {
        const rows = await this.dbCon.execute(
            'SELECT account_id FROM account WHERE account_name = ?',
            [accountName.toLowerCase()]);
        return rows.length ? rows[0].account_id : null;
    }

    async _selectByNaturalPK({ accountName }) {
        const rows = await this.dbCon.execute(
            'SELECT * FROM account WHERE account_name = ?',
            [accountName.toLowerCase()]);
        return rows.length ? rows[0] : null;
    }

    async mapByNaturalPKs(accountNames) {
        return await this.dbCon.keyValueMap(
            `SELECT account_id, 
                    account_name
             FROM account 
             WHERE account_name in (?)`,
            'account_name',
            'account_id',
            [accountNames]);
    }

    async mapByAccountType(accountTypeId) {
        return await this.dbCon.keyValueMap(
            `SELECT account_id, 
                    account_name
             FROM account 
             WHERE account_type_id = ?`,
            'account_name',
            'account_id',
            [accountTypeId]);
    }

    async selectById(accountId) {
        const rows = await this.dbCon.execute(
            `SELECT * 
            FROM account 
            WHERE account_id = ?`,
            [accountId]);
        return rows.length ? rows[0] : null;
    }

    async select() {
        return await this.dbCon.execute(
            `SELECT * 
            FROM account
            WHERE account_id > 0`);
    }

    selectStream(offset = 0) {
        return this.dbConStream.query(
            `SELECT * 
             FROM account
             WHERE account_id > 0
             OFFSET ?, 18446744073709551615`,
            [offset]
        );
    }

    async selectByDappType(dappTypeId) {
        return await this.dbCon.execute(
            `SELECT a.account_id, 
                    a.account_name, 
                    a.account_type_id, 
                    a.dapp_id 
            FROM account a INNER JOIN
                 dapp d ON a.dapp_id = d.dapp_id
            WHERE d.dapp_type_id = ?`,
            [dappTypeId]);
    }

    async _insert({ accountName, accountTypeId, dappId }) {
        return await this.dbCon.execute(
            `INSERT INTO account (account_name, account_type_id, dapp_id)
             VALUES (?, ?, ?)`,
            [accountName.toLowerCase(), accountTypeId, dappId]);
    }

    async _insertBatch(accounts) {
        await this.dbCon.insertBatch(
            `INSERT IGNORE INTO account (account_name, account_type_id, dapp_id)
             VALUES ?`,
            accounts);
    }

    async insert(accountName, accountTypeId, dappId) {
        return await this._insert({ accountName, accountTypeId, dappId });
    }

    async update(accountId, accountTypeId, dappId) {
        await this.dbCon.execute(
            `UPDATE account 
             SET account_type_id = ?,
                 dapp_id = ?
             WHERE account_id = ?`,
            [accountTypeId, dappId, accountId]
        );
    }

    async deleteByNaturalPK(accountName) {
        await this.dbCon.execute(
            `DELETE FROM account 
             WHERE account_name = ?`,
            [accountName.toLowerCase()]
        );
    }

    async _update(oldValues, newValues) {
        const { accountTypeId, dappId } = newValues;
        if (dappId >= 0) {
            const { account_id, dapp_id } = oldValues;
            if (dapp_id < 0) {
                await this.update(account_id, accountTypeId, dappId);
            }
        }
    }

    async getAccountId(accountName, accountTypeId, dappId) {
        return await this._getId({ accountName, accountTypeId, dappId });
    }

    async getAccountIds(accountNames, accountTypeId, dappId) {
        const namesToIds = await this.mapByNaturalPKs(accountNames);
        let toInsert = [];
        for (let accountName of accountNames) {
            toInsert.push([accountName, accountTypeId, dappId]);
        }
        await this._insertBatch(toInsert);
        const missingNames = toInsert.map(account => account[0]);
        const missingNamesToIds = await this.mapByNaturalPKs(missingNames);
        return { ...namesToIds, ...missingNamesToIds };
    }

}

module.exports = AccountDAO;