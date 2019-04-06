
const BaseBatchDao = require('./BaseBatchDao');

class GyftDAO extends BaseBatchDao {
    constructor(dbCon) {
        super([], 1);
        this.dbCon = dbCon;
    }


    _toInsertArray({
        gyfterAccountId,
        gyfteeAccountId,
        eosAccountCreationReimbursement,
        gyfterReward,
        gyfteeReward,
        foundationReward,
        liquidityReward,
        dayId,
        hourOfDay,
        gyftTime,

    }) {
        return [
            gyfterAccountId,
            gyfteeAccountId,
            eosAccountCreationReimbursement,
            gyfterReward,
            gyfteeReward,
            foundationReward,
            liquidityReward,
            dayId,
            hourOfDay,
            gyftTime,
        ];
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO gyft(
                gyfter_account_id,
                gyftee_account_id,
                eos_account_creation_reimbursement,
                gyfter_reward,
                gyftee_reward,
                foundation_reward,
                liquidity_reward,
                day_id,
                hour_of_day,
                gyft_time
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

}


module.exports = GyftDAO;