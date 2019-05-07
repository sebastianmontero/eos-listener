const straw = require('straw');
const dbCon = require('../db/DBConnection');

const { TimeUtil } = require('../util');
const { AccountTypeIds, SpecialValues } = require('../const');
const { AccountDao, TokenDao, TransferDao } = require('../dao');
const logger = require('../Logger').configure('transfer-table-updater');

const { UNKNOWN, NOT_APPLICABLE } = SpecialValues;

module.exports = straw.node({
    initialize: function (opts, done) {
        dbCon.init(opts.config.db);
        this.accountDao = new AccountDao(dbCon);
        this.tokenDao = new TokenDao(dbCon);
        this.transferDao = new TransferDao(dbCon);
        done();
    },

    process: async function (msg, done) {

        try {
            const {
                dappId,
                from,
                fromAccountTypeId,
                fromDappId,
                to,
                toAccountTypeId,
                toDappId,
                quantity,
                quantitySymbol,
                transferTypeId,
                gyfter,
                blockNum,
                actionSeq,
            } = msg;

            let transferTime = new Date(msg.transferTime);

            const ids = await Promise.all([
                this.accountDao.getAccountId(from, fromAccountTypeId, fromDappId),
                this.accountDao.getAccountId(to, toAccountTypeId, toDappId),
                this.tokenDao.getTokenId(quantitySymbol, UNKNOWN.id),
                this.getGyfterAccountId(gyfter),
            ]);

            let toInsert = {
                dappId,
                fromAccountId: ids[0],
                toAccountId: ids[1],
                quantity,
                quantityTokenId: ids[2],
                transferTypeId,
                gyfterAccountId: ids[3],
                dayId: TimeUtil.dayId(transferTime),
                hourOfDay: transferTime.getUTCHours(),
                transferTime: transferTime,
                blockNum,
                actionSeq,
            };
            console.log(toInsert);
            await this.transferDao.batchInsert(toInsert);
            done(false);
        } catch (error) {
            logger.error('Error while processing and inserting transfer.', error);
            throw error;

        }
    },

    getGyfterAccountId: async function (gyfter) {
        return gyfter ? await this.accountDao.getAccountId(gyfter, AccountTypeIds.USER, NOT_APPLICABLE.id) : NOT_APPLICABLE.id;
    },

    stop: async function (done) {
        logger.info('Stopping...');
        await this.transferDao.flush();
        await dbCon.end();
        logger.info('Closed database connection.');
        done(false);
    }
});