const figlet = require('figlet');
const cron = require('node-cron');
const dbCon = require('./db/DBConnection');
const EOSListener = require('./eos-listener/EOSListener');
const { AccountDao, TokenDao, DappTableDao, BlockProducerDao, BlockProducerHistoryDao } = require('./dao');
const { logger } = require('./Logger');
const { BlockProducerTableListener } = require('./table-listener');
const { TimeUtil } = require('./util');

class BlockProducerLoader {
    constructor(config) {
        this.config = config;
        const {
            eoswsAPIKey,
            eoswsAuthUrl,
            eoswsAuthTimeBuffer,
            origin,
            eoswsEndpoint,
            useBlockProgress,
        } = config;

        this.listener = new EOSListener({
            eoswsAPIKey,
            eoswsAuthUrl,
            eoswsAuthTimeBuffer,
            origin,
            eoswsEndpoint,
            useBlockProgress,
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
            const blockProducerDao = new BlockProducerDao(dbCon);
            const blockProducerHistoryDao = new BlockProducerHistoryDao(dbCon);
            let config = {
                accountDao: new AccountDao(dbCon),
                tokenDao: new TokenDao(dbCon),
                dappTableDao: new DappTableDao(dbCon),
                blockProducerDao,
            };
            await blockProducerDao.truncate();
            let blockProducerTableListener = new BlockProducerTableListener(config);
            await this.listener.connect();
            logger.info('Adding Block Producer Table Listener');
            this.listener.addTableListeners(blockProducerTableListener);

            cron.schedule(this.config.blockProducerSnapshotTime, () => {
                this.takeSnapshot(blockProducerHistoryDao);
            });
            logger.info('Added block producer snapshot cron job');
        } catch (error) {
            logger.error(error);
        }
    }


    async takeSnapshot(blockProducerHistoryDao) {
        const date = new Date();
        const dayId = TimeUtil.dayId(date);
        logger.info('Taking block producer snapshot.... For date: ', date);
        await blockProducerHistoryDao.deleteByDayId(dayId);
        logger.info('Deleted block producer snapshot.... For date: ', date);
        await blockProducerHistoryDao.storeSnapshot(dayId);
        logger.info('Block producer snapshot created For date: ', date);
    }
}

module.exports = BlockProducerLoader;
