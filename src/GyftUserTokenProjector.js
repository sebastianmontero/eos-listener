const dbCon = require('./db/DBConnection');
const { GyftDao, GyftTokenProjectionDao } = require('./dao');

class GyftUserTokenProjector {

    constructor(config) {
        this.numSamples = 3;
        this.realDataStepSize = 10;
        this.maxUsers = 1000000000;
        this.decay = 1 - 0.02;
        this.stepIncrease = 0.01;
        this.foundationRewardShare = 1 - 0.1;
        this.gyftDao = new GyftDao(dbCon);
        this.gyftTokenProjectionDao = new GyftTokenProjectionDao(dbCon);
    }

    _determineTierDistributionMean(gyfts) {
        let startDate = new Date('2019-03-01T00:00:00Z');

        let tiers = {};
        let total = 0;
        for (let gyft of gyfts) {
            if (gyft.gyft_time >= startDate) {
                const tier = Math.round(Number(gyft.gyfter_reward) / Number(gyft.gyftee_reward));
                if (!tiers[tier]) {
                    tiers[tier] = 0;
                }
                tiers[tier]++;
                total++;
            }
        }
        let mean = 0;
        for (let tier in tiers) {
            mean += Number(tier) * (tiers[tier] / total);
        }
        return mean;
    }

    _getEOSAccountCreationStats(gyfts) {

        let total = 0;
        let eosAccountCreationCount = 0;
        let eosAccountCreationAmountTotal = 0;
        for (let gyft of gyfts) {
            const reimbursement = Number(gyft.eos_account_creation_reimbursement);
            if (reimbursement > 0) {
                eosAccountCreationCount++;
                eosAccountCreationAmountTotal += reimbursement;
            }
            total++;
        }

        return {
            avgReimbursement: eosAccountCreationAmountTotal / eosAccountCreationCount,
            eosAccountCreationPct: eosAccountCreationCount / total,
        };
    }

    _getUserTokenRelation(gyfts) {

        let numUsers = 0,
            eosAccountCreationReimbursement = 0,
            gyfterReward = 0,
            gyfteeReward = 0,
            foundationReward = 0,
            liquidityReward = 0;

        let userTokenRelation = [];

        for (let gyft of gyfts) {
            numUsers++;
            eosAccountCreationReimbursement += Number(gyft.eos_account_creation_reimbursement);
            gyfterReward += Number(gyft.gyfter_reward);
            gyfteeReward += Number(gyft.gyftee_reward);
            foundationReward += Number(gyft.foundation_reward);
            liquidityReward += Number(gyft.liquidity_reward);

            userTokenRelation.push({
                numUsers,
                eosAccountCreationReimbursement,
                gyfterReward,
                gyfteeReward,
                foundationReward,
                liquidityReward,
                userCountFactor: gyft.gyftee_reward,

            });
        }
        return userTokenRelation;
    }

    _getLastUserCountStepEndStats(userTokenRelation) {

        let length = userTokenRelation.length;
        if (length > 0) {
            let lastUserCountFactor = userTokenRelation[length - 1].userCountFactor;
            for (let i = userTokenRelation.length - 2; i >= 0; i--) {
                if (lastUserCountFactor != userTokenRelation[i].userCountFactor) {
                    return userTokenRelation[i];
                }
            }
        }

        return null;
    }

    async _insertRealData(userTokenRelation) {
        for (let i = 0; i < userTokenRelation.length; i += this.realDataStepSize) {
            await this.gyftTokenProjectionDao.insertObj(userTokenRelation[i]);
        }
    }


    async project() {

        console.log('Truncating projection table...');
        await this.gyftTokenProjectionDao.truncate();

        console.log('Fetching gyfts...');
        const gyfts = await this.gyftDao.selectOrderedByTime(0, 1000);

        console.log('Getting User Token Relation...');
        let userTokenRelation = this._getUserTokenRelation(gyfts);
        console.log('Got User Token Relation.');

        console.log('Inserting real data...');
        await this._insertRealData(userTokenRelation);
        console.log('Inserted real data.');

        await console.log('Calculating Tier Mean...');
        const mean = this._determineTierDistributionMean(gyfts);
        console.log('Calculated Tier Mean: ', mean);

        console.log('Calculating EOS Account Creation Stats...');
        const { avgReimbursement, eosAccountCreationPct } = this._getEOSAccountCreationStats(gyfts);
        console.log(`Calculated EOS Account Creation Stats. AvgReimbursement: ${avgReimbursement}, EOSAccountCreationPct: ${eosAccountCreationPct}`);

        console.log('Getting Last User Count Step End...');
        let lastUserCountStepEndStats = this._getLastUserCountStepEndStats(userTokenRelation);
        console.log(`Got Last User Count Step End Stats.`, lastUserCountStepEndStats);

        let {
            numUsers,
            eosAccountCreationReimbursement,
            gyfterReward,
            gyfteeReward,
            foundationReward,
            liquidityReward,
            userCountFactor
        } = lastUserCountStepEndStats;

        let userCountStepStart;
        let iterations = 0;
        while (numUsers < this.maxUsers) {
            userCountStepStart = numUsers + 1;
            userCountFactor *= this.decay;
            let unitGyfterReward = userCountFactor * mean;
            let unitGyfteeReward = userCountFactor;
            let inflation = unitGyfterReward + unitGyfteeReward;
            let unitFoundationReward = inflation * this.foundationRewardShare;
            let unitLiquidityReward = inflation - unitFoundationReward;
            let userIncrement = Math.ceil(userCountStepStart * this.stepIncrease);
            if ((numUsers + userIncrement) > this.maxUsers) {
                userIncrement = this.maxUsers - numUsers;
            }
            let increment = Math.floor(userIncrement / this.numSamples);
            increment = increment == 0 ? 1 : increment;
            for (let i = 1, userDelta = increment; i <= this.numSamples && userDelta <= userIncrement; i++ , userDelta += increment) {
                if (i == this.numSamples || userDelta + increment > userIncrement) {
                    increment = (userIncrement - userDelta) + increment;
                }
                numUsers += increment;
                eosAccountCreationReimbursement += increment * avgReimbursement * eosAccountCreationPct;
                gyfterReward += unitGyfterReward * increment;
                gyfteeReward += unitGyfteeReward * increment;
                foundationReward += unitFoundationReward * increment;
                liquidityReward += unitLiquidityReward * increment;
                await this.gyftTokenProjectionDao.insertObj({
                    numUsers,
                    eosAccountCreationReimbursement,
                    gyfterReward,
                    gyfteeReward,
                    foundationReward,
                    liquidityReward,
                });
                iterations++;
            }
            console.log(iterations);
        }
        await this.gyftTokenProjectionDao.flush();
        await dbCon.end();
    }
}

module.exports = GyftUserTokenProjector;

