const figlet = require('figlet');
const Snowflake = require('snowflake-promise').Snowflake;
const EOSListener = require('./EOSListener');
const Interpreter = require('./Interpreter');
const TimeUtil = require('./Util/TimeUtil');
const { AccountTypeIds, SpecialValues, OrderTypeIds } = require('./const');
const { AccountDao, ActionDao, ChannelDao, TokenDao } = require('./dao');
const { logger } = require('./Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;

class LoadExchangeData {
    constructor(config) {
        this.config = config;
        this.extractSymbolRegex = /^\s*(\d+.?\d*)\s*([a-zA-Z]+)\s*$/;
        const {
            eoswsToken,
            origin,
            eoswsEndpoint,
            db,
            keyDictionary
        } = config;

        this.listener = new EOSListener({
            eoswsToken,
            origin,
            eoswsEndpoint,
        });

        this.snowflake = new Snowflake(db);
        this.accountDao = new AccountDao(this.snowflake);
        this.actionDao = new ActionDao(this.snowflake);
        this.tokenDao = new TokenDao(this.snowflake);
        this.channelDao = new ChannelDao(this.snowflake);
        this.interpreter = new Interpreter(keyDictionary);

    }


    extractSymbol(value) {
        const result = this.extractSymbolRegex.exec(value);
        if (result) {
            return {
                amount: result[1],
                symbol: result[2],
            };
        }
        return null;
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
            tradeQuantity = this.extractSymbol(tradeQuantity);
            tradePrice = this.extractSymbol(tradePrice);
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
                    quoteAccountId = await this.accountDao.getAccountId(splitPair[0].toLowerCase(), AccountTypeIds.TOKEN);
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


    async _insertExchangeTrade({
        tokenAccountId,
        actionId,
        fromAccountId,
        toAccountId,
        quantity,
        quantityTokenId,
        orderTypeId,
        quoteTokenId,
        baseTokenId,
        tradeQuantity,
        tradePrice,
        channelId,
        dayId,
        hourOfDay,
        blockTime
    }) {

        await this.snowflake.execute(`INSERT INTO exchange_trades(
            token_account_id,
            action_id,
            from_account_id,
            to_account_id,
            quantity,
            quantity_token_id,
            order_type_id,
            quote_token_id,
            base_token_id,
            trade_quantity,
            trade_price,
            channel_id,
            day_id,
            hour_of_day,
            block_time
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tokenAccountId,
                actionId,
                fromAccountId,
                toAccountId,
                quantity,
                quantityTokenId,
                orderTypeId,
                quoteTokenId,
                baseTokenId,
                tradeQuantity,
                tradePrice,
                channelId,
                dayId,
                hourOfDay,
                blockTime

            ]);
    }

    async start() {
        const {
            actionTraces,
            actionFilters,
        } = this.config;

        this.printFiglet();

        try {
            await this.snowflake.connect();
            this.listener.addActionTraces({
                actionTraces,
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
                        const tokenAccountId = await this.accountDao.getAccountId(account, AccountTypeIds.TOKEN);
                        const quantityObj = this.extractSymbol(quantity);
                        const quantityTokenId = await this.tokenDao.getTokenId(quantityObj.symbol, UNKNOWN);
                        const { quoteTokenId, baseTokenId } = await this._determinePair(quantityObj.symbol, quantityTokenId, pair);
                        const dayId = TimeUtil.dayId(blockTime);
                        const channelId = channel ? await this.channelDao.getChannelId(channel) : UNKNOWN;
                        const toInsert = {
                            tokenAccountId,
                            actionId: await this.actionDao.getActionId(action, tokenAccountId),
                            fromAccountId: await this.accountDao.getAccountId(from, AccountTypeIds.USER),
                            toAccountId: await this.accountDao.getAccountId(to, AccountTypeIds.EXCHANGE),
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
                        await this._insertExchangeTrade(toInsert);
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
}

module.exports = LoadExchangeData;
