const config = require('config');
const BaseTopology = require('./BaseTopology');
const logger = require('./Logger');
require('events').EventEmitter.defaultMaxListeners = 0;

logger.configure('load-voters');

class VoterTopology extends BaseTopology {

    getNodes() {
        return [{
            id: 'dummy-producer',
            node: 'DummyProducer',
            output: 'ping-out',
            config,
        }, {
            id: 'voter-processor',
            node: 'VotesProcessor',
            input: 'ping-out',
        }];
    }
}

new VoterTopology('voter-topology', {
    config,
    purge: true,
}).start();