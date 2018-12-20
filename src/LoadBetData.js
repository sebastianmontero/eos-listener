const figlet = require('figlet');
const Snowflake = require('snowflake-promise').Snowflake;
const EOSListener = require('./EOSListener');
const { AccountDao, ActionDao, TokenDao, DappTableDao, BetDao } = require('./dao');
const { logger } = require('./Logger');
const { FishjoyTableListener, FarmEOSTableListener } = require('./table-listener');

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
        this.dappTableDao = new DappTableDao(this.snowflake);
        this.betDao = new BetDao(this.snowflake);

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
            await this.snowflake.connect();
            /* let fishJoyTableListener = new FishjoyTableListener({
                accountDao: this.accountDao,
                tokenDao: this.tokenDao,
                dappTableDao: this.dappTableDao,
                betDao: this.betDao
            });
            logger.debug('Adding Fishjoy Table Listener');
            this.listener.addTableListeners(fishJoyTableListener);  */
            let farmEOSTableListener = new FarmEOSTableListener({
                accountDao: this.accountDao,
                tokenDao: this.tokenDao,
                dappTableDao: this.dappTableDao,
                betDao: this.betDao
            });
            logger.debug('Adding FarmEOS Table Listener');
            this.listener.addTableListeners(farmEOSTableListener);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = LoadBetData;
