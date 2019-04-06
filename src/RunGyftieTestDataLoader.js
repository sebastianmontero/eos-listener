const GyftieTestDataLoader = require('./GyftieTestDataLoader');
const config = require('config');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');

logger.configure('load-gyftie-test-data');
dbCon.init(config.db);
let loader = new GyftieTestDataLoader(config);

process.on('SIGTERM', async () => {
    if (loader) {
        logger.logger.info('Kill order recieved...');
        await loader.stop();
        logger.logger.info('Stored state and performed cleanup. Kill again to terminate.');
        loader = null;
    } else {
        logger.logger.info('Second kill order recieved. Terminating.');
        process.exit();
    }
});


loader.start();
