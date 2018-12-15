const figlet = require('figlet');
const Snowflake = require('snowflake-promise').Snowflake;
const EOSListener = require('./EOSListener');
const { TimeUtil, Util } = require('./util');
const { AccountTypeIds, SpecialValues } = require('./const');
const { AccountDao, ActionDao, TokenDao } = require('./dao');
const { logger } = require('./Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;

class LoadBetData {
    constructor(config) {
        this.config = config;
        const {
            eoswsToken,
            origin,
            eoswsEndpoint,
            db,
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

    }

    printFiglet() {
        figlet('Loading Bet Data', {
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
            betTables
        } = this.config;

        this.printFiglet();

        try {
            this.listener.addTableListeners({ tables: betTables });
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = LoadBetData;
