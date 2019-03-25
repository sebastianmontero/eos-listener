const BlockProducerLoader = require('./BlockProducerLoader');
const config = require('config');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');
require('events').EventEmitter.defaultMaxListeners = 0;

logger.configure('load-block-producers');
dbCon.init(config.db);
const loader = new BlockProducerLoader(config);
loader.start();