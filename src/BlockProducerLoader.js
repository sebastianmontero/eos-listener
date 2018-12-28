const figlet = require('figlet');
const Snowflake = require('snowflake-promise').Snowflake;
const EOSListener = require('./EOSListener');
const { AccountDao, ActionDao, TokenDao, DappTableDao, BlockProducerDao } = require('./dao');
const { logger } = require('./Logger');
const { BlockProducerTableListener } = require('./table-listener');

class BlockProducerLoader {
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
        this.blockProducerDao = new BlockProducerDao(this.snowflake);

    }

    printFiglet() {
        figlet('Loading Block Producers', {
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
            let config = {
                accountDao: this.accountDao,
                tokenDao: this.tokenDao,
                dappTableDao: this.dappTableDao,
                blockProducerDao: this.blockProducerDao,
            };
            /* const parameters = await this.blockProducerDao.showParameters();
            for (let parameter of parameters) {
                const { key, value } = parameter;
                console.log(`${key}:${value}`);
            } */
            await this.blockProducerDao.truncate();
            let blockProducerTableListener = new BlockProducerTableListener(config);
            logger.debug('Adding Block Producer Table Listener');
            this.listener.addTableListeners(blockProducerTableListener);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = BlockProducerLoader;
