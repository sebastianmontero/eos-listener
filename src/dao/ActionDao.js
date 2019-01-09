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