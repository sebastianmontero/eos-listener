const AccountBalanceLoader = require('./AccountBalanceLoader.js');
const config = require('config');
const logger = require('./Logger');
require('events').EventEmitter.defaultMaxListeners = 50;

logger.configure('account-balance-loader');
const loader = new AccountBalanceLoader(config);
loader.start();