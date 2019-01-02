const BaseDao = require('./BaseDao');


class AccountDAO extends BaseDao {
    constructor(dbCon) {
        super(dbCon, 'account_id');
    }

    async selectAccountId(accountName) {
        return await this._selectId({ accountName });
    }

    async _selectId({ accountName }) {
        const [rows] = await this.dbCon.execute(
            'SELECT account_id FROM account WHERE account_name = ?',
            [accountName.toLowerCase()]);
        return rows.length ? rows[0].account_id : null;
    }

    async _selectByNaturalPK({ accountName }) {
        const [rows] = await this.dbCon.execute(
            'SELECT * FROM account WHERE account_name = ?',
            [accountName.toLowerCase()]);
        return rows.length ? rows[0] : null;
    }

    async selectById(accountId) {
        const [rows] = await this.dbCon.execute(
            `SELECT * 
            FROM account 
            WHERE account_id = ?`,
            [accountId]);
        return rows.length ? rows[0] : null;
    }

    async select() {
        const [rows] = await this.dbCon.execute(
            `SELECT * 
            FROM account
            WHERE account_id > 0`);
        return rows;
    }

    selectStream() {
        return this.dbCon.createStatement({
            sqlText:
                `SELECT * 
                FROM account
                WHERE account_id > 0`,
            streamResult: true
        });
    }

    async selectByDappType(dappTypeId) {
        const [rows] = await this.dbCon.execute(
            `SELECT a.account_id, 
                    a.account_name, 
                    a.account_type_id, 
                    a.dapp_id 
            FROM account a INNER JOIN
                 dapp d ON a.dapp_id = d.dapp_id
            WHERE d.dapp_type_id = ?`,
            [dappTypeId]);
        return rows;
    }

    async _insert({ accountName, accountTypeId, dappId }) {
        const [result] = await this.dbCon.execute(
            `INSERT INTO account (account_name, account_type_id, dapp_id)
             VALUES (?, ?, ?)`,
            [accountName.toLowerCase(), accountTypeId, dappId]);
        return result;
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

}

module.exports = AccountDAO;