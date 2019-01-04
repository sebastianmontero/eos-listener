const VoterLoader = require('./VoterLoader');
const config = require('config');
const logger = require('./Logger');
require('events').EventEmitter.defaultMaxListeners = 20;

logger.configure('load-voters');
const loader = new VoterLoader(config);
loader.start();