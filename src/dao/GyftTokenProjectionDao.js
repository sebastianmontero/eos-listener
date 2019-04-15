
const BaseBatchDao = require('./BaseBatchDao');

class GyftTokenProjectionDAO extends BaseBatchDao {
    constructor(dbCon) {
        super([], 500);
        this.dbCon = dbCon;
    }


    _toInsertArray({
        numUsers,
        eosAccountCreationReimbursement,
        gyfterReward,
        gyfteeReward,
        foundationReward,
        liquidityReward,

    }) {
        return [
            numUsers,
            eosAccountCreationReimbursement,
            gyfterReward,
            gyfteeReward,
            foundationReward,
            liquidityReward,
        ];
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO gyft_token_projection(
                num_users,
                eos_account_creation_reimbursement,
                gyfter_reward,
                gyftee_reward,
                foundation_reward,
                liquidity_reward
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

    async truncate() {
        await this.dbCon.execute(
            `truncate gyft_token_projection`
        );
    }

}


module.exports = GyftTokenProjectionDAO;