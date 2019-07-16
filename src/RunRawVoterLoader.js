const RawVoterLoader = require('./RawVoterLoader');
const config = require('config');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');
require('events').EventEmitter.defaultMaxListeners = 0;

logger.configure('load-raw-voters');
dbCon.init(config.db);
const loader = new RawVoterLoader(config);
loader.start();