const BaseDao = require('./BaseDao');


class ActionDAO extends BaseDao {
    constructor(dbCon) {
        super(dbCon, 'action_id');
    }

    async selectActionId(actionName, accountId) {
        return await this._selectId({ actionName, accountId });
    }

    async _selectId({ actionName, accountId }) {
        const rows = await this.dbCon.execute(
            'SELECT action_id FROM action WHERE action_name = ? and account_id = ?',
            [actionName, accountId]);
        return rows.length ? rows[0].action_id : null;
    }

    async _selectByNaturalPK({ actionName, accountId }) {
        const rows = await this.dbCon.execute(
            'SELECT * FROM action WHERE action_name = ? and account_id = ?',
            [actionName, accountId]);
        return rows.length ? rows[0] : null;
    }

    async selectByDappTypeAndActionNameWithProgress(dappTypeId, actionName) {
        return await this.dbCon.execute(
            `SELECT act.action_id,
                    act.action_name,
                    a.account_id,
                    a.account_name, 
                    a.account_type_id, 
                    a.dapp_id,
                    abp.block_progress
            FROM action act INNER JOIN
                 account a ON act.account_id = a.account_id INNER JOIN
                 dapp d ON a.dapp_id = d.dapp_id  LEFT JOIN
                 action_block_progress abp ON act.action_id = abp.action_id 
            WHERE d.dapp_type_id = ?  AND
                  act.action_name = ?`,
            [dappTypeId, actionName]);
    }

    async selectByAccountNameAndActionNameWithProgress(accountName, actionName) {
        return await this.dbCon.execute(
            `SELECT act.action_id,
                    act.action_name,
                    a.account_id,
                    a.account_name, 
                    a.account_type_id, 
                    a.dapp_id,
                    abp.block_progress
            FROM action act INNER JOIN
                 account a ON act.account_id = a.account_id LEFT JOIN
                 action_block_progress abp ON act.action_id = abp.action_id 
            WHERE a.account_name = ?  AND
                  act.action_name = ?`,
            [accountName, actionName]);
    }

    async selectByAccountNameAndActionNamesWithProgress(accountName, actionNames) {
        return await this.dbCon.query(
            `SELECT act.action_id,
                    act.action_name,
                    a.account_id,
                    a.account_name, 
                    a.account_type_id, 
                    a.dapp_id,
                    abp.block_progress
            FROM action act INNER JOIN
                 account a ON act.account_id = a.account_id LEFT JOIN
                 action_block_progress abp ON act.action_id = abp.action_id 
            WHERE a.account_name = ?  AND
                  act.action_name in (?)`,
            [accountName, actionNames]);
    }

    async _insert({ actionName, accountId }) {
        return await this.dbCon.execute(
            `INSERT INTO action (action_name, account_id)
             VALUES (?, ?)`,
            [actionName, accountId]);
    }

    async insert(actionName, accountId) {
        return await this._insert({ actionName, accountId });
    }

    async getActionId(actionName, accountId) {
        return await this._getId({ actionName, accountId });
    }

}

module.exports = ActionDAO;