const AccountBalanceLoader = require('./AccountBalanceLoader.js');
const config = require('config');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');
require('events').EventEmitter.defaultMaxListeners = 50;

logger.configure('account-balance-loader');
dbCon.init(config.db);
const loader = new AccountBalanceLoader(config);
loader.start();