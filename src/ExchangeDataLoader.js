const figlet = require('figlet');
const DBCon = require('./db/DBConnection');
const EOSListener = require('./eos-listener/EOSListener');
const BlockProgress = require('./eos-listener/BlockProgress');
const Interpreter = require('./Interpreter');
const { Util, TimeUtil } = require('./util');
const { AccountTypeIds, SpecialValues, OrderTypeIds, DappTypeIds } = require('./const');
const { AccountDao, ActionDao, ActionBlockProgressDao, ChannelDao, DappDao, TokenDao, ExchangeTradeDao } = require('./dao');
const { logger } = require('./Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class ExchangeDataLoader {
    constructor(config) {
        this.config = config;
        const {
            eoswsToken,
            origin,
            eoswsEndpoint,
            keyDictionary
        } = config;

        this.listener = new EOSListener({
            eoswsToken,
            origin,
            eoswsEndpoint,
        });

        this.interpreter = new Interpreter(keyDictionary);
        this.baseStreamOptions = {
            with_progress: 20,
        };

    }

    printFiglet() {
        figlet('Loading Exchange Data', {
            font: "Big",
            horizontalLayout: 'default',
            verticalLayout: 'default'
        }, (err, data) => {
            if (err) {
                console.log('Something went wrong...');
                console.dir(err);
                return;
            }
            console.log(data)
            console.log("");
            console.log("----- Using Configuration ---- ")
            console.log(this.config);
            console.log("----- End Configuration ---- ")
            console.log("\n\n ")

        });

    }

    _postProcessParsedMemo(parsedMemo) {
        if (parsedMemo) {
            let { tradeQuantity, tradePrice } = parsedMemo;
            tradeQuantity = Util.parseAsset(tradeQuantity);
            tradePrice = Util.parseAsset(tradePrice);
            let pair = null;
            if (tradeQuantity) {
                pair = tradeQuantity.symbol;
                parsedMemo.tradeQuantity = tradeQuantity.amount
            }
            if (tradePrice) {
                let symbol = tradePrice.symbol;
                if (pair) {
                    if (pair.toUpperCase() == 'EOS') {
                        pair = `${symbol}_${pair}`;
                    } else {
                        pair = `${pair}_${symbol}`;
                    }
                } else {
                    pair = symbol;
                }
                parsedMemo.tradePrice = tradePrice.amount;
            }
            if (pair && !parsedMemo.pair) {
                parsedMemo.pair = pair;
            }
        } else {
            parsedMemo = {
                tradePrice: null,
                tradeQuantity: null,
            };
        }
        return parsedMemo;
    }

    _getOrderTypeId(orderType) {
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

    async _determinePair(quantityToken, quantityTokenId, pair) {
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
    }

    async _getActionTraces() {
        const tokenTransferActions = await this.actionDao.selectByDappTypeAndActionNameWithProgress(
            DappTypeIds.TOKEN,
            'transfer'
        );
        let actionTraces = [];
        for (let tokenTransferAction of tokenTransferActions) {
            actionTraces.push({
                actionId: tokenTransferAction.action_id,
                codeAccountId: tokenTransferAction.account_id,
                account: tokenTransferAction.account_name,
                action_name: tokenTransferAction.action_name,
                streamOptions: { ...this.baseStreamOptions },
                blockProgress: new BlockProgress(tokenTransferAction.block_progress),
            });
        }
        return actionTraces;
    }

    async _getActionFilters() {
        const exchangeAccounts = await this.accountDao.selectByDappType(DappTypeIds.EXCHANGE);
        let to = [];
        for (let exchangeAccount of exchangeAccounts) {
            to.push(exchangeAccount.account_name);
        }
        return {
            transfer: {
                to
            }
        };
    }

    async start() {

        this.printFiglet();

        try {
            const dbCon = await DBCon.createConnection(this.config.db);
            this.dbCon = dbCon;
            this.accountDao = new AccountDao(dbCon);
            this.actionDao = new ActionDao(dbCon);
            this.tokenDao = new TokenDao(dbCon);
            this.channelDao = new ChannelDao(dbCon);
            this.dappDao = new DappDao(dbCon);
            this.exchangeTradeDao = new ExchangeTradeDao(dbCon);
            const actionTraces = await this._getActionTraces();
            logger.info("Action Traces:", actionTraces);
            const actionFilters = await this._getActionFilters();
            logger.info("Action Filters:", actionFilters);

            this.listener.addActionTraces({
                actionTraces: actionTraces,
                actionFilters,
                callbackFn: async payload => {
                    const {
                        account,
                        action,
                        actionData: { to, from, quantity, memo },
                        block_time: blockTime,
                    } = payload;

                    try {
                        let parsedMemo = this._postProcessParsedMemo(this.interpreter.interpret(memo));
                        const { tradePrice, tradeQuantity, orderType, channel, pair } = parsedMemo;
                        const tokenAccountId = await this.accountDao.getAccountId(account, AccountTypeIds.DAPP, UNKNOWN);
                        const quantityObj = Util.parseAsset(quantity);
                        const quantityTokenId = await this.tokenDao.getTokenId(quantityObj.symbol, UNKNOWN);
                        const { quoteTokenId, baseTokenId } = await this._determinePair(quantityObj.symbol, quantityTokenId, pair);
                        const dayId = TimeUtil.dayId(blockTime);
                        const channelId = channel ? await this.channelDao.getChannelId(channel) : UNKNOWN;
                        const toInsert = {
                            tokenAccountId,
                            actionId: await this.actionDao.getActionId(action, tokenAccountId),
                            fromAccountId: await this.accountDao.getAccountId(from, AccountTypeIds.USER, NOT_APPLICABLE),
                            toAccountId: await this.accountDao.getAccountId(to, AccountTypeIds.DAPP, UNKNOWN),
                            quantity: quantityObj.amount,
                            quantityTokenId,
                            orderTypeId: this._getOrderTypeId(orderType),
                            quoteTokenId,
                            baseTokenId,
                            tradeQuantity,
                            tradePrice,
                            channelId,
                            dayId,
                            hourOfDay: blockTime.getUTCHours(),
                            blockTime: TimeUtil.toUTCDateTimeNTZString(blockTime)
                        };
                        await this.exchangeTradeDao.insert(toInsert);
                    } catch (error) {
                        logger.error(error);
                        throw error;
                    }
                }
            });
        } catch (error) {
            logger.error(error);
        }
    }
    async stop() {
        const { actionTraces } = await this.listener.stop();
        logger.info('Storing block progress for action traces...', actionTraces);
        const toInsert = actionTraces.map((actionTrace) => [
            actionTrace.actionId,
            actionTrace.blockProgress.serialize(),
        ]);
        const actionBlockProgressDao = new ActionBlockProgressDao(this.dbCon);
        await actionBlockProgressDao.insert(toInsert);
        logger.info('Stored block progress for action traces...', toInsert);
        await this.dbCon.end();
        logger.info('Closed database connection.');

    }
}

module.exports = ExchangeDataLoader;
