const BaseDao = require('./BaseDao');


class ActionDAO extends BaseDao {
    constructor(snowflake) {
        super(snowflake);
    }

    async selectActionId(actionName, accountId) {
        return await this._selectId({ actionName, accountId });
    }

    async _selectId({ actionName, accountId }) {
        const rows = await this.snowflake.execute('SELECT action_id FROM action WHERE action_name = :1 and account_id = :2', [actionName, accountId]);
        return rows.length ? rows[0].ACTION_ID : null;
    }

    async _insert({ actionName, accountId }) {
        await this.snowflake.execute(
            `INSERT INTO action (action_name, account_id)
             VALUES (?, ?)`,
            [actionName, accountId]);
    }

    async insert(actionName, accountId) {
        await this._insert({ actionName, accountId });
    }

    async getActionId(actionName, accountId) {
        return await this._getId({ actionName, accountId });
    }

}

module.exports = ActionDAO;