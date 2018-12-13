const BaseDao = require('./BaseDao');


class AccountDAO extends BaseDao {
    constructor(snowflake) {
        super(snowflake);
    }

    async selectAccountId(accountName) {
        return await this._selectId({ accountName });
    }

    async _selectId({ accountName }) {
        const rows = await this.snowflake.execute('SELECT account_id FROM account WHERE account_name = :1', [accountName]);
        return rows.length ? rows[0].ACCOUNT_ID : null;
    }

    async _insert({ accountName, accountTypeId }) {
        await this.snowflake.execute(
            `INSERT INTO account (account_name, account_type_id)
             VALUES (?, ?)`,
            [accountName, accountTypeId]);
    }

    async insert(accountName, accountTypeId) {
        await this._insert({ accountName, accountTypeId });
    }

    async getAccountId(accountName, accountTypeId) {
        return await this._getId({ accountName, accountTypeId });
    }

}

module.exports = AccountDAO;