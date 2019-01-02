process.env["NODE_CONFIG_DIR"] = __dirname + "/../config";
console.log(process.env["NODE_CONFIG_DIR"]);
const TimeDimensionLoader = require('./TimeDimensionLoader');
const config = require('config');

const { db } = config;
const loader = new TimeDimensionLoader(db, 2017, 2022);
loader.load();