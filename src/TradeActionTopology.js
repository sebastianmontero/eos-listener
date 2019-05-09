
const BaseTopology = require('./BaseTopology');
const config = require('config');
const { ActionTraceFactory, ActionTraceKeys } = require('@smontero/gyftie-listener');
const logger = require('./Logger');

logger.configure('trade-action-loader');


class TradeActionTopolgy extends BaseTopology {

    async getNodes() {
        const actionTraces = {
            "gftorderbook-tradeexec": ActionTraceFactory.getActionTrace(ActionTraceKeys.TRADES, {
                blockNum: "40000000",
                outputKey: "gftorderbook-tradeexec",
            }),
        };

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
}

new TradeActionTopolgy('trade-action-topology', {
    config,
}).start();

