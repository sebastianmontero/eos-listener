const figlet = require('figlet');
const DBCon = require('./db/DBConnection');
const EOSListener = require('./eos-listener/EOSListener');
const { AccountDao, TokenDao, DappTableDao, DappTableBlockProgressDao, BetDao } = require('./dao');
const { logger } = require('./Logger');
const {
    FishjoyTableListener,
    FarmEOSTableListener,
    EOSBetTableListener,
    FastwinTableListener,
    EndlessDiceTableListener,
    PokerEOSGameGamesRecordTableListener,
    PokerEOSBullBetRecordTableListener
} = require('./table-listener');

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
            let config = {
                accountDao: new AccountDao(dbCon),
                tokenDao: new TokenDao(dbCon),
                dappTableDao: new DappTableDao(dbCon),
                betDao: new BetDao(dbCon)
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
            /* let pokerEOSGameGamesRecordTableListener = new PokerEOSGameGamesRecordTableListener(config);
            logger.info('Adding PokerEOSGame GamesRecord Table Listener');
            this.listener.addTableListeners(pokerEOSGameGamesRecordTableListener); */
            let pokerEOSBullBetRecordTableListener = new PokerEOSBullBetRecordTableListener(config);
            logger.info('Adding PokerEOSBull BetRecord Table Listener');
            this.listener.addTableListeners(pokerEOSBullBetRecordTableListener);
        } catch (error) {
            logger.error(error);
        }
    }

    async stop() {
        const { tableListeners } = await this.listener.stop();
        logger.info('Storing block progress for table listeners...', tableListeners);
        const toInsert = tableListeners.map((tableListener) => [
            tableListener.dappTableId,
            tableListener.blockProgress.serialize(),
        ]);
        const dappTableBlockProgressDao = new DappTableBlockProgressDao(this.dbCon);
        await dappTableBlockProgressDao.insert(toInsert);
        logger.info('Stored block progress for action traces...', toInsert);
        await this.dbCon.end();
        logger.info('Closed database connection.');

    }
}

module.exports = BetDataLoader;
