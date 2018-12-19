
const BaseDao = require('./BaseDao');


class DappTableDAO extends BaseDao {
    constructor(snowflake) {
        super(snowflake);
    }

    async selectDappTableId(dappTableName, codeAccountId, scopeAccountId) {
        return await this._selectId({ dappTableName, codeAccountId, scopeAccountId });
    }

    async _selectId({ dappTableName, codeAccountId, scopeAccountId }) {
        const rows = await this.snowflake.execute(
            `SELECT dapp_table_id 
            FROM dapp_table
            WHERE dapp_table_name = :1 AND
                  code_account_id = :2 AND
                  scope_account_id = :3`,
            [dappTableName, codeAccountId, scopeAccountId]
        );
        return rows.length ? rows[0].DAPP_TABLE_ID : null;
    }

    async _insert({ dappTableName, codeAccountId, scopeAccountId }) {
        await this.snowflake.execute(
            `INSERT INTO dapp_table (dapp_table_name, code_account_id, scope_account_id)
             VALUES (?, ?, ?)`,
            [dappTableName, codeAccountId, scopeAccountId]
        );
    }

    async insert(dappTableName, codeAccountId, scopeAccountId) {
        await this._insert({ dappTableName, codeAccountId, scopeAccountId });
    }

    async getDappTableId(dappTableName, codeAccountId, scopeAccountId) {
        return await this._getId({ dappTableName, codeAccountId, scopeAccountId });
    }

    async selectByDappId(dappId) {
        return await this.snowflake.execute(
            `SELECT dapp_table_id, 
                    dapp_table_name, 
                    code_account_id,
                    ca.account_name code_account_name,
                    scope_account_id,
                    sa.account_name scope_account_name
            FROM dapp_table dt INNER JOIN
                account ca ON dt.code_account_id = ca.account_id INNER JOIN
                account sa ON dt.scope_account_id = sa.account_id
            WHERE ca.dapp_id = :1`,
            [dappId]
        );
    }

    async selectByDappTypeId(dappTypeId) {
        return await this.snowflake.execute(
            `SELECT dapp_table_id, 
                    dapp_table_name, 
                    code_account_id,
                    ca.account_name code_account_name,
                    scope_account_id,
                    sa.account_name scope_account_name
            FROM dapp_table dt INNER JOIN
                 account ca ON dt.code_account_id = ca.account_id INNER JOIN
                 account sa ON dt.scope_account_id = sa.account_id INNER JOIN
                 dapp d ON ca.dapp_id = d.dapp_id
            WHERE d.dapp_type_id = :1`,
            [dappTypeId]
        );
    }

}

module.exports = DappTableDAO;