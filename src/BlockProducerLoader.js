const figlet = require('figlet');
const DBCon = require('./db/DBConnection');
const EOSListener = require('./EOSListener');
const { AccountDao, TokenDao, DappTableDao, BlockProducerDao } = require('./dao');
const { logger } = require('./Logger');
const { BlockProducerTableListener } = require('./table-listener');

class BlockProducerLoader {
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
            const dbCon = await DBCon.createConnection(this.config.db);
            const blockProducerDao = new BlockProducerDao(dbCon);
            let config = {
                accountDao: new AccountDao(dbCon),
                tokenDao: new TokenDao(dbCon),
                dappTableDao: new DappTableDao(dbCon),
                blockProducerDao,
            };
            /* const parameters = await this.blockProducerDao.showParameters();
            for (let parameter of parameters) {
                const { key, value } = parameter;
                console.log(`${key}:${value}`);
            } */
            await blockProducerDao.truncate();
            let blockProducerTableListener = new BlockProducerTableListener(config);
            logger.debug('Adding Block Producer Table Listener');
            this.listener.addTableListeners(blockProducerTableListener);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = BlockProducerLoader;
