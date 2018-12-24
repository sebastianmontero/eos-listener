const BetDataLoader = require('./BetDataLoader');
const config = require('config');
const logger = require('./Logger');

logger.configure('load-bet-data');
const loader = new BetDataLoader(config);
loader.start();