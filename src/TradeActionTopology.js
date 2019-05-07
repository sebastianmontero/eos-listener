
const straw = require('straw');
const config = require('config');
const { ActionTraceFactory, ActionTraceKeys } = require('@smontero/gyftie-listener');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');
const ListenerConfig = require('./ListenerConfig');

require('events').EventEmitter.defaultMaxListeners = 0;
logger.configure('trade-action-loader');


class TradeActionTopolgy {

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
        const actionTraces = [];
        actionTraces.push(ActionTraceFactory.getActionTrace(ActionTraceKeys.TRADES, {
            blockNum: "40000000",
            outputKey: "gftorderbook-tradeexec",
        }));

        const config = this.config;
        let nodes = [{
            id: 'gql-eos-listener',
            node: 'GQLEOSListener',
            outputs: {
                'gftorderbook-tradeexec': 'gftorderbook-tradeexec',
            },
            config,
            actionTraces,
        },
        {
            id: 'gyft-exchange-trade-interpreter',
            node: 'GyftExchangeTradeInterpreter',
            input: 'gftorderbook-tradeexec',
            outputs: {
                trade: 'trade'
            }
        },
        {
            id: 'trade-table-updater',
            node: 'TradeTableUpdater',
            input: 'trade',
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

new TradeActionTopolgy(config, dbCon).start();

