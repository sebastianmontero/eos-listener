const BPEndpointListGenerator = require('./BPEndpointListGenerator');
const config = require('config');
const loader = new BPEndpointListGenerator(config);
loader.start();