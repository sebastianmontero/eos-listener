const LoadExchangeData = require('./LoadExchangeData');
const config = require('config');
const loader = new LoadExchangeData(config);
loader.start();