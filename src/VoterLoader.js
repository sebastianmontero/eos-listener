const figlet = require('figlet');
const cron = require('node-cron');
const DBCon = require('./db/DBConnection');
const EOSListener = require('./eos-listener/EOSListener');
const {
    AccountDao,
    TokenDao,
    DappTableDao,
    BlockProducerDao,
    VoterDao,
    VoterBlockProducerDao,
    VoterBlockProducerHistoryDao } = require('./dao');
const { logger } = require('./Logger');
const { VoterTableListener } = require('./table-listener');
const { TimeUtil } = require('./util');

class VoterLoader {
    constructor(config) {
        this.config = config;
        const {
            eoswsToken,
            origin,
            eoswsEndpoint,
            useBlockProgress,
        } = config;

        this.listener = new EOSListener({
            eoswsToken,
            origin,
            eoswsEndpoint,
            useBlockProgress,
        });

    }

    printFiglet() {
        figlet('Loading Voters', {
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
            const voterBlockProducerDao = new VoterBlockProducerDao(dbCon);
            const voterBlockProducerHistoryDao = new VoterBlockProducerHistoryDao(dbCon);
            let config = {
                accountDao: new AccountDao(dbCon),
                tokenDao: new TokenDao(dbCon),
                dappTableDao: new DappTableDao(dbCon),
                blockProducerDao: new BlockProducerDao(dbCon),
                voterDao: new VoterDao(dbCon),
                voterBlockProducerDao,
            };
            await voterBlockProducerDao.truncate();
            let voterTableListener = new VoterTableListener(config);
            logger.debug('Adding Voter Table Listener');
            this.listener.addTableListeners(voterTableListener);

            cron.schedule(this.config.voterSnapshotTime, () => {
                this.takeSnapshot(voterBlockProducerHistoryDao);
            });
            logger.info('Added voter block producer snapshot cron job');
        } catch (error) {
            logger.error(error);
        }
    }

    async takeSnapshot(voterBlockProducerHistoryDao) {
        const date = new Date();
        const dayId = TimeUtil.dayId(date);
        logger.info('Taking voter block producer snapshot.... For date: ', date);
        await voterBlockProducerHistoryDao.deleteByDayId(dayId);
        logger.info('Deleted voter block producer snapshot.... For date: ', date);
        await voterBlockProducerHistoryDao.storeSnapshot(dayId);
        logger.info('Voter block producer snapshot created For date: ', date);
    }
}

module.exports = VoterLoader;
