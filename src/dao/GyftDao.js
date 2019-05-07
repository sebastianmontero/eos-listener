
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
        blockNum,
        actionSeq,

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
            blockNum,
            actionSeq,
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
                gyft_time,
                block_num,
                action_seq
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

    async selectOrderedByTime(offset, limit) {
        return await this.dbCon.execute(
            `SELECT * 
            FROM gyft 
            ORDER BY gyft_time
            LIMIT ?, ?`,
            [offset, limit]);
    }

    async selectFromDate(date) {
        return await this.dbCon.execute(
            `SELECT * 
            FROM gyft 
            WHERE gyft_time > ?
            ORDER BY gyft_time`,
            [date]);
    }

}


module.exports = GyftDAO;