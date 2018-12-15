const LoadBetData = require('./LoadBetData');
const config = require('config');
const logger = require('./Logger');

logger.configure('load-bet-data');
const loader = new LoadBetData(config);
loader.start();