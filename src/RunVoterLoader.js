const VoterLoader = require('./VoterLoader');
const config = require('config');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');
require('events').EventEmitter.defaultMaxListeners = 0;

logger.configure('load-voters');
dbCon.init(config.db);
const loader = new VoterLoader(config);
loader.start();