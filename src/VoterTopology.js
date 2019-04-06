
const straw = require('straw');
const config = require('config');
const logger = require('./Logger');
require('events').EventEmitter.defaultMaxListeners = 0;

logger.configure('load-voters');


const opts = {
    nodes_dir: __dirname + '/nodes',
    redis: {
        host: '127.0.0.1',
        port: 6379,
        prefix: 'straw-example'
    },
};

var topo = straw.create(opts);

topo.add([{
    id: 'eos-event-listener',
    node: 'EOSEventListener',
    output: 'ping-out',
    config,
}, {
    id: 'voter-processor',
    node: 'VotesProcessor',
    input: 'ping-out',
}], function () {
    topo.start({ purge: true });
});

process.on('SIGINT', function () {
    topo.destroy(function () {
        console.log('Finished.');
    });
});