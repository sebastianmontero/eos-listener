
const straw = require('straw');
const config = require('config');
const { ActionTraceFactory, ActionTraceKeys } = require('@smontero/gyftie-listener');
const logger = require('./Logger');
const dbCon = require('./db/DBConnection');
const ListenerConfig = require('./ListenerConfig');

require('events').EventEmitter.defaultMaxListeners = 0;
logger.configure('order-book-loader');


class OrderBookTopolgy {

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

        actionTraces.push(
            ActionTraceFactory.getActionTrace(ActionTraceKeys.ORDER_BOOK_CHANGES, {
                blockNum: "42261484",
                outputKey: "gftorderbook-orderbook",
            })
        );

        const config = this.config;
        let nodes = [{
            id: 'gql-eos-listener',
            node: 'GQLEOSListener',
            outputs: {
                'gftorderbook-orderbook': 'gftorderbook-orderbook',
            },
            config,
            actionTraces,
        },
        {
            id: 'order-interpreter',
            node: 'GyftExchangeOrderInterpreter',
            input: 'gftorderbook-orderbook',
            output: 'order'
        },
        {
            id: 'order-id-fetcher',
            node: 'GyftExchangeOrderIdFetcher',
            input: 'order',
            outputs: {
                market: 'market',
                limit: ['limit1', 'limit2'],
            },
            config,
        },
        {
            id: 'order-book-table-updater',
            node: 'OrderBookTableUpdater',
            input: ['market', 'limit1'],
            config,
        },
        {
            id: 'order-book-change-table-updater',
            node: 'OrderBookChangeTableUpdater',
            input: 'limit2',
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

new OrderBookTopolgy(config, dbCon).start();

