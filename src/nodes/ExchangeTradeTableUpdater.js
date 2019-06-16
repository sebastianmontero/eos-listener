const straw = require('@smontero/straw');
const dbCon = require('../db/DBConnection');
const {
    AccountDao,
    ActionDao,
    ChannelDao,
    DappDao,
    TokenDao,
    ExchangeTradeDao
} = require('../dao');

const {
    AccountTypeIds,
    SpecialValues,
    OrderTypeIds,
    DappTypeIds
} = require('../const');
const { TimeUtil, Util } = require('../util');
const logger = require('../Logger').configure('exchange-trade-table-updater');

const {
    NOT_APPLICABLE: {
        id: NOT_APPLICABLE
    },
    UNKNOWN: {
        id: UNKNOWN
    }
} = SpecialValues;

module.exports = straw.node({
    initialize: function (opts, done) {
        dbCon.init(opts.config.db);
        this.accountDao = new AccountDao(dbCon);
        this.actionDao = new ActionDao(dbCon);
        this.tokenDao = new TokenDao(dbCon);
        this.channelDao = new ChannelDao(dbCon);
        this.dappDao = new DappDao(dbCon);
        this.exchangeTradeDao = new ExchangeTradeDao(dbCon);
        done();
    },
    process: async function (msg, done) {
        const {
            blockNum,
            actionSeq,
            tokenAccount,
            action,
            to,
            from,
            quantity,
            tradePrice,
            tradeQuantity,
            orderType,
            channel,
            pair,
        } = msg;

        try {

            const quantityObj = Util.parseAsset(quantity);

            const [tokenAccountId, quantityTokenId] = await Promise.all([
                this.accountDao.getAccountId(tokenAccount, AccountTypeIds.DAPP, UNKNOWN),
                this.tokenDao.getTokenId(quantityObj.symbol, UNKNOWN),
            ]);
            const tradeTime = new Date(msg.tradeTime);
            const dayId = TimeUtil.dayId(tradeTime);

            const getChannelId = async channel => channel ? await this.channelDao.getChannelId(channel) : UNKNOWN;

            const [
                {
                    quoteTokenId,
                    baseTokenId
                },
                actionId,
                fromAccountId,
                toAccountId,
                channelId,
            ] = await Promise.all([
                this._determinePair(quantityObj.symbol, quantityTokenId, pair),
                this.actionDao.getActionId(action, tokenAccountId),
                this.accountDao.getAccountId(from, AccountTypeIds.USER, NOT_APPLICABLE),
                this.accountDao.getAccountId(to, AccountTypeIds.DAPP, UNKNOWN),
                getChannelId(channel),
            ]);


            const toInsert = {
                tokenAccountId,
                actionId,
                fromAccountId,
                toAccountId,
                quantity: quantityObj.amount,
                quantityTokenId,
                orderTypeId: this._getOrderTypeId(orderType),
                quoteTokenId,
                baseTokenId,
                tradeQuantity,
                tradePrice,
                channelId,
                dayId,
                hourOfDay: tradeTime.getUTCHours(),
                blockTime: tradeTime,
                blockNum,
                actionSeq,
            };
            await this.exchangeTradeDao.batchInsert(toInsert);
            done(false);
        } catch (error) {
            logger.error('Error while processing and inserting trade.', error);
            done(true);
        }
    },

    stop: async function (done) {
        logger.info('Stopping...');
        await this.exchangeTradeDao.flush();
        await dbCon.end();
        logger.info('Closed database connection.');
        done(false);
    },

    _determinePair: async function (quantityToken, quantityTokenId, pair) {
        let baseTokenId = UNKNOWN, quoteTokenId = UNKNOWN;
        quantityToken = quantityToken.toUpperCase();
        if (quantityToken == 'EOS') {
            baseTokenId = quantityTokenId;
        } else {
            quoteTokenId = quantityTokenId;
        }

        if (pair) {
            pair = pair.toUpperCase();
            let splitPair = pair.split(/[-_]/);
            for (let i = 0; i < splitPair.length; i++) {
                splitPair[0] = splitPair[0].trim();
            }
            if (splitPair.length == 1) {
                if (splitPair[0] != quantityToken) {
                    let tokenId = await this.tokenDao.getTokenId(splitPair[0], UNKNOWN);
                    if (quoteTokenId === UNKNOWN) {
                        quoteTokenId = tokenId;
                    } else {
                        baseTokenId = tokenId;
                    }
                }
            } else if (splitPair.length === 2 || splitPair.length === 3) {
                let quoteAccountId = UNKNOWN;
                if (splitPair.length == 3) {
                    const accountName = splitPair[0].toLowerCase();
                    quoteAccountId = await this.accountDao.selectAccountId(accountName);
                    if (!quoteAccountId) {
                        const dappId = await this.dappDao.getDappId(accountName, DappTypeIds.TOKEN);
                        quoteAccountId = await this.accountDao.getAccountId(splitPair[0].toLowerCase(), AccountTypeIds.DAPP, dappId);
                    }
                    splitPair.shift();
                }
                quoteTokenId = await this.tokenDao.getTokenId(splitPair[0], quoteAccountId);
                baseTokenId = await this.tokenDao.getTokenId(splitPair[1], UNKNOWN);
            }
        }

        return {
            baseTokenId,
            quoteTokenId,
        };
    },

    _getOrderTypeId: function (orderType) {
        let orderTypeId = UNKNOWN;
        if (orderType) {
            orderType = orderType.toLowerCase();
            if (orderType.indexOf('cancel') != -1) {
                orderTypeId = OrderTypeIds.CANCEL;
            } else if (orderType.indexOf('buy') != -1) {
                orderTypeId = orderType.indexOf('limit') != -1 ? OrderTypeIds.BUY_LIMIT : OrderTypeIds.BUY;
            } else if (orderType.indexOf('sell') != -1) {
                orderTypeId = orderType.indexOf('limit') != -1 ? OrderTypeIds.SELL_LIMIT : OrderTypeIds.SELL;
            }
        }
        return orderTypeId;
    }
});