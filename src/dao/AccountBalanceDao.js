const BaseBatchDao = require('./BaseBatchDao');

class AccountBalanceDAO extends BaseBatchDao {
    constructor(dbCon) {
        super('accountId', 50);
        this.dbCon = dbCon;
    }

    async insert(obj) {
        await this._insert(this._toInsertArray(obj));
    }

    async _insert(values) {

        await this.dbCon.query(
            `INSERT INTO account_balance(
                account_id,
                day_id,
                liquid,
                staked,
                refund
            ) VALUES ?`,
            [values]);
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
        await this.dbCon.execute(
            `DELETE FROM account_balance
             WHERE day_id = ?`,
            [dayId]);
    }

}

module.exports = AccountBalanceDAO;