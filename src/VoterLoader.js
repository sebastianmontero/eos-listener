const figlet = require('figlet');
const mysql = require('mysql2/promise');
const EOSListener = require('./EOSListener');
const {
    AccountDao,
    TokenDao,
    DappTableDao,
    BlockProducerDao,
    VoterDao,
    VoterBlockProducerDao } = require('./dao');
const { logger } = require('./Logger');
const { VoterTableListener } = require('./table-listener');

class VoterLoader {
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
            const dbCon = await mysql.createConnection(this.config.db);
            const voterBlockProducerDao = new VoterBlockProducerDao(dbCon);
            let config = {
                accountDao: new AccountDao(dbCon),
                tokenDao: new TokenDao(dbCon),
                dappTableDao: new DappTableDao(dbCon),
                blockProducerDao: new BlockProducerDao(dbCon),
                voterDao: new VoterDao(dbCon),
                voterBlockProducerDao,
            };
            /* const parameters = await this.blockProducerDao.showParameters();
            for (let parameter of parameters) {
                const { key, value } = parameter;
                console.log(`${key}:${value}`);
            } */
            await voterBlockProducerDao.truncate();
            let voterTableListener = new VoterTableListener(config);
            logger.debug('Adding Voter Table Listener');
            this.listener.addTableListeners(voterTableListener);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = VoterLoader;
