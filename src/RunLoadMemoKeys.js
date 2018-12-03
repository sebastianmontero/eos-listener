const LoadMemoKeys = require('./LoadMemoKeys');
const config = require('config');
const logger = require('./Logger');

logger.configure('load-memo-keys');
const loader = new LoadMemoKeys(config);
loader.start();