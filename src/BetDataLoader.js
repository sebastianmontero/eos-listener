const figlet = require('figlet');
const DBCon = require('./db/DBConnection');
const EOSListener = require('./eos-listener/EOSListener');
const BlockProgress = require('./eos-listener/BlockProgress');
const { AccountDao, ActionDao, ActionBlockProgressDao, TokenDao, DappTableDao, DappTableBlockProgressDao, BetDao } = require('./dao');
const { AccountTypeIds, SpecialValues, BetStatusIds } = require('./const');
const { logger } = require('./Logger');
const { Util, TimeUtil } = require('./util');
const {
    FishjoyTableListener,
    FarmEOSTableListener,
    EOSBetTableListener,
    FastwinTableListener,
    EndlessDiceTableListener,
    PokerEOSGameGamesRecordTableListener,
    PokerEOSBullBetRecordTableListener
} = require('./table-listener');


const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class BetDataLoader {
    constructor(config) {
        this.config = config;
        const {
            eoswsToken,
            origin,
            eoswsEndpoint,
        } = config;

        this.listener = new EOSListener({
            eoswsToken,
            origin,
            eoswsEndpoint,
        });

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


    async start() {

        this.printFiglet();

        try {
            const dbCon = await DBCon.createConnection(this.config.db);
            this.dbCon = dbCon;
            this.betDao = new BetDao(dbCon);
            this.accountDao = new AccountDao(dbCon);
            this.tokenDao = new TokenDao(dbCon);
            let config = {
                accountDao: this.accountDao,
                tokenDao: this.tokenDao,
                dappTableDao: new DappTableDao(dbCon),
                betDao: this.betDao,
            };
            /* let fishJoyTableListener = new FishjoyTableListener(config);
            logger.info('Adding Fishjoy Table Listener');
            this.listener.addTableListeners(fishJoyTableListener);
            let farmEOSTableListener = new FarmEOSTableListener(config);
            logger.info('Adding FarmEOS Table Listener');
            this.listener.addTableListeners(farmEOSTableListener);
            let eosBetTableListener = new EOSBetTableListener(config);
            logger.info('Adding EOSBet Table Listener');
            this.listener.addTableListeners(eosBetTableListener);
            let fastwinTableListener = new FastwinTableListener(config);
            logger.info('Adding Fastwin Table Listener');
            this.listener.addTableListeners(fastwinTableListener);
            let endlessDiceTableListener = new EndlessDiceTableListener(config);
            logger.info('Adding Endless Table Listener');
            this.listener.addTableListeners(endlessDiceTableListener); */
            let pokerEOSGameGamesRecordTableListener = new PokerEOSGameGamesRecordTableListener(config);
            logger.info('Adding PokerEOSGame GamesRecord Table Listener');
            this.listener.addTableListeners(pokerEOSGameGamesRecordTableListener);
            /* let pokerEOSBullBetRecordTableListener = new PokerEOSBullBetRecordTableListener(config);
            logger.info('Adding PokerEOSBull BetRecord Table Listener');
            this.listener.addTableListeners(pokerEOSBullBetRecordTableListener);
            logger.info('Adding BetDiceAdmin DiceRecipt Action Trace');
            await this._addDiceReciptActionTrace(); */
        } catch (error) {
            logger.error(error);
        }
    }

    async _addDiceReciptActionTrace() {
        const actionDao = new ActionDao(this.dbCon);
        const actions = await actionDao.selectByAccountNameAndActionNameWithProgress(
            'betdiceadmin',
            'dicereceipt'
        );

        let actionTraces = [];
        for (let action of actions) {
            actionTraces.push({
                actionId: action.action_id,
                codeAccountId: action.account_id,
                account: action.account_name,
                action_name: action.action_name,
                streamOptions: { with_progress: 20 },
                blockProgress: new BlockProgress(action.block_progress),
            });
        }

        this.listener.addActionTraces({
            actionTraces,
            callbackFn: async payload => {
                const {
                    actionId,
                    codeAccountId,
                    actionData: {
                        accountName,
                        betAsset,
                        payoutAsset,
                    },
                    block_time: blockTime,
                } = payload;

                try {

                    const { amount: betAmount, symbol: betSymbol } = Util.parseAsset(betAsset);
                    const { amount: winAmount, symbol: winSymbol } = Util.parseAsset(payoutAsset);

                    const betTokenId = await this.tokenDao.getTokenId(betSymbol, UNKNOWN);
                    const winTokenId = await this.tokenDao.getTokenId(winSymbol, UNKNOWN);

                    const toInsert = {
                        dappTableId: NOT_APPLICABLE,
                        gameBetId: null,
                        actionId,
                        codeAccountId,
                        userAccountId: await this.accountDao.getAccountId(accountName, AccountTypeIds.USER, NOT_APPLICABLE),
                        betAmount: betAmount,
                        betTokenId: betTokenId,
                        winAmount,
                        winTokenId: winTokenId,
                        betStatusId: BetStatusIds.COMPLETED,
                        placedDayId: TimeUtil.dayId(blockTime),
                        placedHourOfDay: blockTime.getUTCHours(),
                        placedTime: TimeUtil.toUTCDateTimeNTZString(blockTime),
                        completedDayId: UNKNOWN,
                        completedHourOfDay: null,
                        completedTime: null,
                    };
                    await this.betDao.batchInsert(toInsert);
                } catch (error) {
                    logger.error(error);
                    throw error;
                }
            }
        });

        return actionTraces;
    }

    async stop() {
        const { tableListeners, actionTraces } = await this.listener.stop();
        logger.info('Flushing Bet Data in batch to the database...');
        await this.betDao.flush();
        if (tableListeners.length > 0) {
            logger.info('Storing block progress for table listeners...', tableListeners);
            const toInsert = tableListeners.map((tableListener) => [
                tableListener.dappTableId,
                tableListener.blockProgress.serialize(),
            ]);
            const dappTableBlockProgressDao = new DappTableBlockProgressDao(this.dbCon);
            await dappTableBlockProgressDao.insert(toInsert);
            logger.info('Stored block progress for table listeners...', toInsert);
        }
        if (actionTraces.length > 0) {
            logger.info('Storing block progress for action traces...', actionTraces);
            const toInsert = actionTraces.map((actionTrace) => [
                actionTrace.actionId,
                actionTrace.blockProgress.serialize(),
            ]);
            const actionBlockProgressDao = new ActionBlockProgressDao(this.dbCon);
            await actionBlockProgressDao.insert(toInsert);
            logger.info('Stored block progress for action traces...', toInsert);
        }
        await this.dbCon.end();
        logger.info('Closed database connection.');

    }
}

module.exports = BetDataLoader;
