const ExchangeDataLoader = require('./ExchangeDataLoader');
const config = require('config');
const logger = require('./Logger');

logger.configure('load-exchange-data');
let loader = new ExchangeDataLoader(config);

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

