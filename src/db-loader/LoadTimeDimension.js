process.env["NODE_CONFIG_DIR"] = __dirname + "/../config";
console.log(process.env["NODE_CONFIG_DIR"]);
const DateLoader = require('./DateLoader');
const config = require('config');

const { db } = config;
const loader = new DateLoader(db, 2017, 2020);
loader.load();