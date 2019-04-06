
const straw = require('straw');
const config = require('config');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');
const ListenerConfig = require('./ListenerConfig');

require('events').EventEmitter.defaultMaxListeners = 0;
logger.configure('gyft-action-loader');


class GyftActionTopolgy {

    constructor(config, dbCon) {
        this.opts = {
            nodes_dir: __dirname + '/nodes',
            redis: {
                host: '127.0.0.1',
                port: 6379,
                prefix: 'gyftie'
            },
        };
        dbCon.init(config.db);
        this.purge = true;
        this.listenerConfig = new ListenerConfig(dbCon);
        this.config = config;
        this.dbCon = dbCon;
    }

    async start() {
        await this._create(await this._getNodes(), this.opts);
        await this.dbCon.end();
    }
    async _getNodes() {
        const actionTraces = await this.listenerConfig.getActionListener("gyftietokens", ["gyft", "gyft2"]);
        const config = this.config;
        let nodes = [{
            id: 'eos-event-listener',
            node: 'EOSEventListener',
            output: 'gyftietokens-gyft',
            config,
            actionTraces,
        }, {
            id: 'gyft-action-transfers-interpreter',
            node: 'GyftActionTransfersInterpreter',
            input: 'gyftietokens-gyft',
            outputs: {
                transfer: 'transfer',
                gyft: 'gyft'
            }
        },
        {
            id: 'transfer-table-updater',
            node: 'TransferTableUpdater',
            input: 'transfer',
            config,
        },
        {
            id: 'gyft-table-updater',
            node: 'GyftTableUpdater',
            input: 'gyft',
            config,
        }];
        return nodes;
    }
    _create(nodes, opts) {
        var topo = straw.create(opts);
        topo.add(nodes, () => {
            topo.start({ purge: this.purge });
        });
        process.on('SIGINT', () => {
            topo.destroy(function () {
                console.log('Finished.');
            });
        });
        this.topology = topo;
    }
}

new GyftActionTopolgy(config, dbCon).start();

