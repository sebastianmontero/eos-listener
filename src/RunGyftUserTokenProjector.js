const GyftUserTokenProjector = require('./GyftUserTokenProjector');
const config = require('config');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');

logger.configure('user-token-projector');
dbCon.init(config.db);
const loader = new GyftUserTokenProjector(config);
loader.project();