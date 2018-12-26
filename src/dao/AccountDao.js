const BaseDao = require('./BaseDao');


class AccountDAO extends BaseDao {
    constructor(snowflake) {
        super(snowflake);
    }

    async selectAccountId(accountName) {
        return await this._selectId({ accountName });
    }

    async _selectId({ accountName }) {
        const rows = await this.snowflake.execute('SELECT account_id FROM account WHERE account_name = :1', [accountName.toLowerCase()]);
        return rows.length ? rows[0].ACCOUNT_ID : null;
    }

    async selectById(accountId) {
        const rows = await this.snowflake.execute(
            `SELECT account_id, 
                    account_name, 
                    account_type_id, 
                    dapp_id 
            FROM account 
            WHERE account_id = :1`,
            [accountId]);
        return rows.length ? rows[0] : null;
    }

    async select() {
        return await this.snowflake.execute(
            `SELECT account_id, 
                    account_name, 
                    account_type_id, 
                    dapp_id 
            FROM account
            WHERE account_id > 0`);
    }

    selectStream() {
        return this.snowflake.createStatement({
            sqlText:
                `SELECT account_id, 
                    account_name, 
                    account_type_id, 
                    dapp_id 
                FROM account
                WHERE account_id > 0`,
            streamResult: true
        });
    }

    async selectByDappType(dappTypeId) {
        const rows = await this.snowflake.execute(
            `SELECT a.account_id, 
                    a.account_name, 
                    a.account_type_id, 
                    a.dapp_id 
            FROM account a INNER JOIN
                 dapp d ON a.dapp_id = d.dapp_id
            WHERE d.dapp_type_id = :1`,
            [dappTypeId]);
        return rows;
    }

    async _insert({ accountName, accountTypeId, dapp_id }) {
        await this.snowflake.execute(
            `INSERT INTO account (account_name, account_type_id, dapp_id)
             VALUES (?, ?, ?)`,
            [accountName.toLowerCase(), accountTypeId, dapp_id]);
    }

    async insert(accountName, accountTypeId, dapp_id) {
        await this._insert({ accountName, accountTypeId, dapp_id });
    }

    async update(accountId, accountTypeId, dappId) {
        await this.snowflake.execute(
            `UPDATE account 
             SET account_type_id = :1,
                 dapp_id = :2 
             WHERE account_id = :3`,
            [accountTypeId, dappId, accountId]
        );
    }

    async _update({ id, accountTypeId, dappId }) {
        if (dappId >= 0) {
            const account = await this.selectById(id);
            if (account.DAPP_ID < 0) {
                await this.update(id, accountTypeId, dappId);
            }
        }
    }

    async getAccountId(accountName, accountTypeId, dapp_id) {
        return await this._getId({ accountName, accountTypeId, dapp_id });
    }

}

module.exports = AccountDAO;