const ExchangeDataLoader = require('./ExchangeDataLoader');
const config = require('config');
const logger = require('./Logger');

logger.configure('load-exchange-data');
const loader = new ExchangeDataLoader(config);
loader.start();