const straw = require('straw');
const dbCon = require('../db/DBConnection');

const { TimeUtil } = require('../util');
const { SpecialValues } = require('../const');
const { AccountDao, TokenDao, TradeDao } = require('../dao');
const logger = require('../Logger').configure('transfer-table-updater');

const { UNKNOWN } = SpecialValues;

module.exports = straw.node({
    initialize: function (opts, done) {
        dbCon.init(opts.config.db);
        this.accountDao = new AccountDao(dbCon);
        this.tokenDao = new TokenDao(dbCon);
        this.transferDao = new TradeDao(dbCon);
        done();
    },

    process: async function (msg, done) {

        try {
            const {
                dappId,
                buyer,
                buyerAccountTypeId,
                buyerDappId,
                seller,
                sellerAccountTypeId,
                sellerDappId,
                boughtToken,
                priceBought,
                boughtAmount,
                buyOrderTypeId,
                soldToken,
                priceSold,
                soldAmount,
                sellOrderTypeId,
                marketMaker,
                marketMakerFeeInBoughtToken,
                marketMakerFeeInSoldToken,
                blockNum,
                actionSeq,
            } = msg;

            console.log('Trade: ', JSON.stringify(msg));

            let buyerAccountId = await this.accountDao.getAccountId(buyer, buyerAccountTypeId, buyerDappId);
            let sellerAccountId = await this.accountDao.getAccountId(seller, sellerAccountTypeId, sellerDappId);
            let boughtTokenId = await this.tokenDao.getTokenId(boughtToken, UNKNOWN.id);
            let soldTokenId = await this.tokenDao.getTokenId(soldToken, UNKNOWN.id);

            let marketMakerAccountId = marketMaker == buyer ? buyerAccountId : sellerAccountId;

            let tradeTime = new Date(msg.tradeTime);
            let toInsert = {
                dappId,
                buyerAccountId,
                sellerAccountId,
                boughtTokenId,
                priceBought,
                boughtAmount,
                buyOrderTypeId,
                soldTokenId,
                priceSold,
                soldAmount,
                sellOrderTypeId,
                dayId: TimeUtil.dayId(tradeTime),
                hourOfDay: tradeTime.getUTCHours(),
                tradeTime: tradeTime,
                marketMakerAccountId,
                marketMakerFeeInBoughtToken,
                marketMakerFeeInSoldToken,
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

    stop: async function (done) {
        logger.info('Stopping...');
        await this.tradeDao.flush();
        await dbCon.end();
        logger.info('Closed database connection.');
        done(false);
    }
});