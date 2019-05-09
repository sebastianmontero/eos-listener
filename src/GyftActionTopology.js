
const BaseTopology = require('./BaseTopology');
const config = require('config');
const { ActionTraceFactory, ActionTraceKeys } = require('@smontero/gyftie-listener');
const logger = require('./Logger');

logger.configure('gyft-action-loader');


class GyftActionTopolgy extends BaseTopology {


    async getNodes() {

        const actionTraces = {
            'gyftietokens-gyft': ActionTraceFactory.getActionTrace(ActionTraceKeys.GYFT_EVENTS, {
                blockNum: "56928684",
                outputKey: "gyftietokens-gyft",
            })
        };
        const config = this.config;
        let nodes = [{
            id: 'gql-eos-listener',
            node: 'GQLEOSListener',
            outputs: {
                'gyftietokens-gyft': 'gyftietokens-gyft',
            },
            config,
            actionTraces,
        },
        {
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
}

new GyftActionTopolgy('gyft-action-topology', {
    config,
}).start();

