const LoadExchangeData = require('./LoadExchangeData');
const config = require('config');
const logger = require('./Logger');

logger.configure('load-exchange-data');
const loader = new LoadExchangeData(config);
loader.start();