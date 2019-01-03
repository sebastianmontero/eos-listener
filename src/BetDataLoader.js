const figlet = require('figlet');
const mysql = require('mysql2/promise');
const EOSListener = require('./EOSListener');
const { AccountDao, TokenDao, DappTableDao, BetDao } = require('./dao');
const { logger } = require('./Logger');
const {
    FishjoyTableListener,
    FarmEOSTableListener,
    EOSBetTableListener,
    FastwinTableListener,
    EndlessDiceTableListener,
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
            const dbCon = await mysql.createConnection(this.config.db);
            let config = {
                accountDao: new AccountDao(dbCon),
                tokenDao: new TokenDao(dbCon),
                dappTableDao: new DappTableDao(dbCon),
                betDao: new BetDao(dbCon)
            };
            let fishJoyTableListener = new FishjoyTableListener(config);
            logger.debug('Adding Fishjoy Table Listener');
            this.listener.addTableListeners(fishJoyTableListener);
            let farmEOSTableListener = new FarmEOSTableListener(config);
            logger.debug('Adding FarmEOS Table Listener');
            this.listener.addTableListeners(farmEOSTableListener);
            let eosBetTableListener = new EOSBetTableListener(config);
            logger.debug('Adding EOSBet Table Listener');
            this.listener.addTableListeners(eosBetTableListener);
            let fastwinTableListener = new FastwinTableListener(config);
            logger.debug('Adding Fastwin Table Listener');
            this.listener.addTableListeners(fastwinTableListener);
            let endlessDiceTableListener = new EndlessDiceTableListener(config);
            logger.debug('Adding Endless Table Listener');
            this.listener.addTableListeners(endlessDiceTableListener);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = BetDataLoader;
