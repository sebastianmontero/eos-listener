const BlockProducerLoader = require('./BlockProducerLoader');
const config = require('config');
const logger = require('./Logger');
require('events').EventEmitter.defaultMaxListeners = 0;

logger.configure('load-block-producers');
const loader = new BlockProducerLoader(config);
loader.start();