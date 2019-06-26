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

        this.redis = opts.redis.client;
        this.prefix = opts.redis.prefix;
        dbCon.init(opts.config.db);
        this.accountDao = new AccountDao(dbCon);
        this.actionDao = new ActionDao(dbCon);
        this.tokenDao = new TokenDao(dbCon);
        this.channelDao = new ChannelDao(dbCon);
        this.dappDao = new DappDao(dbCon);
        this.exchangeTradeDao = new ExchangeTradeDao(dbCon);
        this.CHANNEL_ID_KEY = this.generateKey('channel-id');
        this.ACCOUNT_ID_KEY = this.generateKey('account-id');
        this.TOKEN_ID_KEY = this.generateKey('token-id');
        this.ACTION_ID_KEY = this.generateKey('action-id');
        this.DAPP_ID_KEY = this.generateKey('dapp-id');
        this._getAccountId = this.accountDao.getAccountId.bind(this.accountDao);
        this._selectAccountId = this.accountDao.selectAccountId.bind(this.accountDao);
        this._getTokenId = this.tokenDao.getTokenId.bind(this.tokenDao);
        this._getChannelId = this.channelDao.getChannelId.bind(this.channelDao);
        this._getActionId = this.actionDao.getActionId.bind(this.actionDao);
        this._getDappId = this.dappDao.getDappId.bind(this.dappDao);
        done();
    },

    generateKey: function (key) {
        return this.generateField([this.prefix, key]);
    },

    generateField: function (fields) {
        return fields.join('-');
    },

    getCacheValue: async function (key, field) {
        return await this.redis.hget(key, field);
    },

    setCacheValue: async function (key, field, value) {
        return await this.redis.hset(key, field, value);
    },

    getValue: async function (key, fn, params) {
        let field = this.generateField(params);
        let value = await this.getCacheValue(key, field);
        if (!value) {
            value = await fn(...params);
            if (value) {
                await this.setCacheValue(key, field, value);
            }
        }
        return value;
    },

    getActionId: async function (action, accountId) {
        return await this.getValue(
            this.ACTION_ID_KEY,
            this._getActionId,
            [action, accountId]);
    },

    getAccountId: async function (account, accountTypeId, dappId = UNKNOWN) {
        return await this.getValue(
            this.ACCOUNT_ID_KEY,
            this._getAccountId,
            [account, accountTypeId, dappId]);
    },

    selectAccountId: async function (account) {
        return await this.getValue(
            this.ACCOUNT_ID_KEY,
            this._selectAccountId,
            [account]);
    },

    getTokenId: async function (symbol, accountId = UNKNOWN) {
        if (accountId == 'null') {
            throw 'Account id is null';
        }
        try {
            return await this.getValue(
                this.TOKEN_ID_KEY,
                this._getTokenId,
                [symbol, accountId]);
        } catch (e) {
            console.log(`Symbol: ${symbol} and accountId: ${accountId}`);
            console.dir(e);
            throw e;
        }
    },

    getDappId: async function (account, dappTypeId) {
        return await this.getValue(
            this.DAPP_ID_KEY,
            this._getDappId,
            [account, dappTypeId]);
    },

    getChannelId: async function (channel) {
        if (!channel) {
            return UNKNOWN;
        }
        return await this.getValue(
            this.CHANNEL_ID_KEY,
            this._getChannelId,
            [channel]);
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

            this.getTokenId(quantityObj.symbol);

            const [tokenAccountId, quantityTokenId] = await Promise.all([
                this.getAccountId(tokenAccount, AccountTypeIds.DAPP),
                this.getTokenId(quantityObj.symbol),
            ]);
            const tradeTime = new Date(msg.tradeTime);
            const dayId = TimeUtil.dayId(tradeTime);

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
                this.getActionId(action, tokenAccountId),
                this.accountDao.getAccountId(from, AccountTypeIds.USER, NOT_APPLICABLE),
                this.getAccountId(to, AccountTypeIds.DAPP),
                this.getChannelId(channel),
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
                    this.getTokenId(splitPair[0]);
                    let tokenId = await this.getTokenId(splitPair[0]);
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
                    quoteAccountId = await this.selectAccountId(accountName);
                    if (!quoteAccountId) {
                        const dappId = await this.getDappId(accountName, DappTypeIds.TOKEN);
                        quoteAccountId = await this.getAccountId(splitPair[0].toLowerCase(), AccountTypeIds.DAPP, dappId);
                    }
                    splitPair.shift();
                }
                this.getTokenId(splitPair[0], quoteAccountId);
                this.getTokenId(splitPair[1], UNKNOWN);
                [quoteTokenId, baseTokenId] = await Promise.all([
                    this.getTokenId(splitPair[0], quoteAccountId),
                    this.getTokenId(splitPair[1], UNKNOWN),
                ]);
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