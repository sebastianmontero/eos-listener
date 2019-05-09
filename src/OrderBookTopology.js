
const BaseTopology = require('./BaseTopology');
const config = require('config');
const { ActionTraceFactory, ActionTraceKeys } = require('@smontero/gyftie-listener');
const logger = require('./Logger');
logger.configure('order-book-loader');


class OrderBookTopolgy extends BaseTopology {

    async getNodes() {
        const actionTraces = {
            "gftorderbook-orderbook": ActionTraceFactory.getActionTrace(ActionTraceKeys.ORDER_BOOK_CHANGES, {
                blockNum: "56748068",
                outputKey: "gftorderbook-orderbook",
            })
        };

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
}

new OrderBookTopolgy('order-book-topology', {
    config,
}).start();

