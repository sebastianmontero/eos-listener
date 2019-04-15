const { GyftDao, GyftTokenProjectionDao } = require('./dao');

class GyftUserTokenRelationLoader {

    constructor(dbCon) {
        this.gyftDao = new GyftDao(dbCon);
        this.gyftTokenProjectionDao = new GyftTokenProjectionDao(dbCon);
    }

    async load() {

        await this.gyftTokenProjectionDao.truncate();
        const gyfts = await this.gyftDao.selectOrderedByTime(0, 1000);

        let numUsers = 0,
            eosAccountCreationReimbursement = 0,
            gyfterReward = 0,
            gyfteeReward = 0,
            foundationReward = 0,
            liquidityReward = 0;

        for (let gyft of gyfts) {
            numUsers++;
            eosAccountCreationReimbursement += Number(gyft.eos_account_creation_reimbursement);
            gyfterReward += Number(gyft.gyfter_reward);
            gyfteeReward += Number(gyft.gyftee_reward);
            foundationReward += Number(gyft.foundation_reward);
            liquidityReward += Number(gyft.liquidity_reward);

            await this.gyftTokenProjectionDao.insertObj({
                numUsers,
                eosAccountCreationReimbursement,
                gyfterReward,
                gyfteeReward,
                foundationReward,
                liquidityReward,
            });
        }

        await this.gyftTokenProjectionDao.flush();

        return {
            numUsers,
            eosAccountCreationReimbursement,
            gyfterReward,
            gyfteeReward,
            foundationReward,
            liquidityReward,
            totalGft: eosAccountCreationReimbursement + gyfterReward + gyfteeReward + foundationReward + liquidityReward,
        };
    }
}

module.exports = GyftUserTokenRelationLoader;

