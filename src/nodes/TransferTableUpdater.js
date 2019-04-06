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
            } = msg;

            let transferTime = new Date(msg.transferTime);
            let gyfterAccountId = gyfter ? await this.accountDao.getAccountId(from, AccountTypeIds.USER, NOT_APPLICABLE.id) : NOT_APPLICABLE.id;
            let toInsert = {
                dappId,
                fromAccountId: await this.accountDao.getAccountId(from, fromAccountTypeId, fromDappId),
                toAccountId: await this.accountDao.getAccountId(to, toAccountTypeId, toDappId),
                quantity,
                quantityTokenId: await this.tokenDao.getTokenId(quantitySymbol, UNKNOWN.id),
                transferTypeId,
                gyfterAccountId,
                dayId: TimeUtil.dayId(transferTime),
                hourOfDay: transferTime.getUTCHours(),
                transferTime: transferTime,
            };
            console.log(toInsert);
            await this.transferDao.batchInsert(toInsert);
            done(false);
        } catch (error) {
            logger.error('Error while processing and inserting transfer.', error);
            throw error;

        }
    },

    stop: async function (done) {
        logger.info('Stopping...');
        await this.transferDao.flush();
        await dbCon.end();
        logger.info('Closed database connection.');
        done(false);
    }
});