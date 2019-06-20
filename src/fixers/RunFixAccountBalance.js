process.env["NODE_CONFIG_DIR"] = __dirname + "/../config";
const FixAccountBalance = require('./FixAccountBalance');
const config = require('config');
const dbCon = require('../db/DBConnection');

dbCon.init(config.db);
const fixer = new FixAccountBalance(config);
fixer.fix();