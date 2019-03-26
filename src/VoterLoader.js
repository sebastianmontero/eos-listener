const figlet = require('figlet');
const cron = require('node-cron');
const dbCon = require('./db/DBConnection');
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

class VoterLoader {
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
        const { voterNumDaysBack } = this.config;
        const title = 'Loading Voters.' + (voterNumDaysBack ? `History Mode: ${voterNumDaysBack}` : '');
        figlet(title, {
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
            const voterBlockProducerDao = new VoterBlockProducerDao(dbCon);
            const voterBlockProducerHistoryDao = new VoterBlockProducerHistoryDao(dbCon);
            let config = {
                accountDao: new AccountDao(dbCon),
                tokenDao: new TokenDao(dbCon),
                dappTableDao: new DappTableDao(dbCon),
                blockProducerDao: new BlockProducerDao(dbCon),
                voterDao: new VoterDao(dbCon),
                voterBlockProducerDao,
                voterBlockProducerHistoryDao,
            };
            const { voterNumDaysBack } = this.config;
            let voterTableListener = new VoterTableListener(config);
            if (voterNumDaysBack) {
                logger.info(`Loading Voter History. Number of days: ${voterNumDaysBack}`);
                await this.historyMode(voterTableListener, voterNumDaysBack);
                logger.info('Finished loading voter history');
                dbCon.end();
                logger.info('Closed database connection.');
            } else {
                this.normalMode(voterTableListener);
            }

        } catch (error) {
            logger.error("Failed to start VoterLoader.", error);
        }
    }

    async normalMode(voterTableListener) {
        await this.listener.connect();
        logger.info('Adding Voter Table Listener');
        this.listener.addTableListeners(voterTableListener);

        cron.schedule(this.config.voterSnapshotTime, () => {
            this.listener.takeSnapshot();
        });
        logger.info('Added voter block producer snapshot cron job');
    }

    async historyMode(voterTableListener, numDaysBack) {
        await this.listener.loadTableHistory(voterTableListener, numDaysBack)

    }
}

module.exports = VoterLoader;
