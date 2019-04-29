const OrderBookHistoryLoader = require('./OrderBookHistoryLoader');
const config = require('config');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');

logger.configure('order-book-history-loader');
dbCon.init(config.db);
const loader = new OrderBookHistoryLoader(config);
loader.start();