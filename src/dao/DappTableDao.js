
const BaseDao = require('./BaseDao');


class DappTableDAO extends BaseDao {
    constructor(dbCon) {
        super(dbCon, 'dapp_table_id');
    }

    async selectDappTableId(dappTableName, codeAccountId, scopeAccountId) {
        return await this._selectId({ dappTableName, codeAccountId, scopeAccountId });
    }

    async _selectId({ dappTableName, codeAccountId, scopeAccountId }) {
        const rows = await this.dbCon.execute(
            `SELECT dapp_table_id 
            FROM dapp_table
            WHERE dapp_table_name = ? AND
                  code_account_id = ? AND
                  scope_account_id = ?`,
            [dappTableName, codeAccountId, scopeAccountId]
        );
        return rows.length ? rows[0].dapp_table_id : null;
    }

    async _selectByNaturalPK({ dappTableName, codeAccountId, scopeAccountId }) {
        const rows = await this.dbCon.execute(
            `SELECT * 
            FROM dapp_table
            WHERE dapp_table_name = ? AND
                  code_account_id = ? AND
                  scope_account_id = ?`,
            [dappTableName, codeAccountId, scopeAccountId]
        );
        return rows.length ? rows[0] : null;
    }

    async _insert({ dappTableName, codeAccountId, scopeAccountId }) {
        return await this.dbCon.execute(
            `INSERT INTO dapp_table (dapp_table_name, code_account_id, scope_account_id)
             VALUES (?, ?, ?)`,
            [dappTableName, codeAccountId, scopeAccountId]
        );
    }

    async insert(dappTableName, codeAccountId, scopeAccountId) {
        return await this._insert({ dappTableName, codeAccountId, scopeAccountId });
    }

    async getDappTableId(dappTableName, codeAccountId, scopeAccountId) {
        return await this._getId({ dappTableName, codeAccountId, scopeAccountId });
    }

    async select(dappTableId) {
        return await this.dbCon.execute(
            `SELECT dapp_table_id, 
                    dapp_table_name, 
                    code_account_id,
                    ca.account_name code_account_name,
                    scope_account_id,
                    sa.account_name scope_account_name
            FROM dapp_table dt INNER JOIN
                account ca ON dt.code_account_id = ca.account_id INNER JOIN
                account sa ON dt.scope_account_id = sa.account_id
            WHERE dt.dapp_table_id = ?`,
            [dappTableId]
        );
    }

    async selectByDappId(dappId) {
        return await this.dbCon.execute(
            `SELECT dapp_table_id, 
                    dapp_table_name, 
                    code_account_id,
                    ca.account_name code_account_name,
                    scope_account_id,
                    sa.account_name scope_account_name
            FROM dapp_table dt INNER JOIN
                account ca ON dt.code_account_id = ca.account_id INNER JOIN
                account sa ON dt.scope_account_id = sa.account_id
            WHERE ca.dapp_id = ?`,
            [dappId]
        );
    }

    async selectByDappTypeId(dappTypeId) {
        return await this.dbCon.execute(
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
            WHERE d.dapp_type_id = ?`,
            [dappTypeId]
        );
    }

}

module.exports = DappTableDAO;