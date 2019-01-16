const ExchangeDataLoader = require('./ExchangeDataLoader');
const config = require('config');
const logger = require('./Logger');

logger.configure('load-exchange-data');
let loader = new ExchangeDataLoader(config);

process.on('SIGINT', () => {
    process.exit();
});

process.on('SIGTERM', async () => {
    if (loader) {
        await loader.stop();
        logger.logger.info('Stored state and performed cleanup. Kill again to terminate.');
        loader = null;
    } else {
        process.exit();
    }
});

process.on('exit', async () => {
    //await loader.stop();
});

loader.start();

