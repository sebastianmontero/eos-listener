const BaseBatchDao = require('./BaseBatchDao');

class AccountBalanceDAO extends BaseBatchDao {
    constructor(snowflake) {
        super('accountId', 50);
        this.snowflake = snowflake;
    }

    async insert(obj) {
        await this._insert(this._toInsertArray(obj));
    }

    async _insert(values) {

        await this.snowflake.execute(
            `INSERT INTO account_balance(
                account_id,
                day_id,
                liquid,
                staked,
                refund
            ) VALUES(?, ?, ?, ?, ?)`,
            values);
    }

    _toInsertArray({
        accountId,
        dayId,
        liquid,
        staked,
        refund,
    }) {
        return [
            accountId,
            dayId,
            liquid,
            staked,
            refund,

        ];
    }


    async deleteByDayId(dayId) {
        await this.snowflake.execute(
            `DELETE FROM account_balance
             WHERE day_id = ?`,
            [dayId]);
    }

}

module.exports = AccountBalanceDAO;