const AccountBalanceLoader = require('./AccountBalanceLoader.js');
const config = require('config');
const logger = require('./Logger');
logger.configure('account-balance-loader');
const loader = new AccountBalanceLoader(config);
loader.start();