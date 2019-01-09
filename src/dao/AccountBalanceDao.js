const BaseBatchDao = require('./BaseBatchDao');

class AccountBalanceDAO extends BaseBatchDao {
    constructor(dbCon) {
        super('accountId', 50);
        this.dbCon = dbCon;
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO account_balance(
                account_id,
                day_id,
                liquid,
                staked,
                refund
            ) VALUES ?`,
            values,
            toArray);
    }

    async insert(values) {
        await this._insert(values);
    }

    async insertObj(objs) {
        await this._insert(objs, this._toInsertArray);
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