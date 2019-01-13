const VoterLoader = require('./VoterLoader');
const config = require('config');
const logger = require('./Logger');
require('events').EventEmitter.defaultMaxListeners = 0;

logger.configure('load-voters');
const loader = new VoterLoader(config);
loader.start();