const straw = require('@smontero/straw');
const dbCon = require('../db/DBConnection');

const { TimeUtil } = require('../util');
const { AccountTypeIds, SpecialValues } = require('../const');
const { AccountDao, GyftDao } = require('../dao');
const logger = require('../Logger').configure('transfer-table-updater');

const { NOT_APPLICABLE } = SpecialValues;

module.exports = straw.node({
    initialize: function (opts, done) {
        dbCon.init(opts.config.db);
        this.accountDao = new AccountDao(dbCon);
        this.gyftDao = new GyftDao(dbCon);
        done();
    },

    process: async function (msg, done) {

        try {
            const {
                gyfter,
                gyftee,
                eosAccountCreationReimbursement,
                gyfterReward,
                gyfteeReward,
                foundationReward,
                liquidityReward,
                blockNum,
                actionSeq,
            } = msg;
            console.log(msg);
            let gyftTime = new Date(msg.gyftTime);
            const ids = await Promise.all([
                this.accountDao.getAccountId(gyfter, AccountTypeIds.USER, NOT_APPLICABLE.id),
                this.accountDao.getAccountId(gyftee, AccountTypeIds.USER, NOT_APPLICABLE.id),
            ]);
            let toInsert = {
                gyfterAccountId: ids[0],
                gyfteeAccountId: ids[1],
                eosAccountCreationReimbursement,
                gyfterReward,
                gyfteeReward,
                foundationReward,
                liquidityReward,
                dayId: TimeUtil.dayId(gyftTime),
                hourOfDay: gyftTime.getUTCHours(),
                gyftTime: gyftTime,
                blockNum,
                actionSeq,
            };
            console.log(toInsert);
            await this.gyftDao.batchInsert(toInsert);
            done(false);
        } catch (error) {
            logger.error('Error while processing and inserting transfer.', error);
            throw error;

        }
    },

    stop: async function (done) {
        logger.info('Stopping...');
        await this.gyftDao.flush();
        await dbCon.end();
        logger.info('Closed database connection.');
        done(false);
    }
});