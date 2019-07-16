const figlet = require('figlet');
const cron = require('node-cron');
const dbCon = require('./db/DBConnection');
const EOSListener = require('./eos-listener/EOSListener');
const {
    AccountDao,
    TokenDao,
    DappTableDao,
    VotersRawDao,
} = require('./dao');
const { logger } = require('./Logger');
const { RawVoterTableListener } = require('./table-listener');

class RawVoterLoader {
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
        const title = 'Loading Voters.' + (this.config.voterHistoryStartDate ? `History Mode.` : '');
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
            const votersRawDao = new VotersRawDao(dbCon);
            let config = {
                accountDao: new AccountDao(dbCon),
                tokenDao: new TokenDao(dbCon),
                dappTableDao: new DappTableDao(dbCon),
                votersRawDao,
            };
            let { voterHistoryStartDate, voterHistoryEndDate } = this.config;
            let voterTableListener = new RawVoterTableListener(config);
            if (voterHistoryStartDate) {
                voterHistoryStartDate = new Date(voterHistoryStartDate);
                voterHistoryEndDate = voterHistoryEndDate ? new Date(voterHistoryEndDate) : null;
                logger.info(`Loading Voter History. Range: ${voterHistoryStartDate} - ${voterHistoryEndDate}`);
                await this.historyMode(voterTableListener, voterHistoryStartDate, voterHistoryEndDate);
                logger.info('Finished loading voter history');
            } else {
                this.normalMode(voterTableListener);
            }

        } catch (error) {
            logger.error("Failed to start RawVoterLoader.", error);
        } finally {
            await dbCon.end();
            logger.info('Closed database connection.');
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

    async historyMode(voterTableListener, startDate, endDate) {
        await this.listener.loadTableHistory(voterTableListener, startDate, endDate);

    }
}

module.exports = RawVoterLoader;
