const straw = require('straw');
const { GQLEOSListener } = require('@smontero/eos-listener-gql');
const Logger = require('../Logger');
const { logger } = Logger;

module.exports = straw.node({
    initialize: async function (opts, done) {
        this.opts = opts;
        const {
            config: {
                apiKey,
                network,
                endpoint,
            },
            actionTraces,
        } = opts;

        Logger.configure('gql-event-listener');
        this.listener = new GQLEOSListener({
            apiKey,
            network,
            endpoint,
        });
        this.actionTraces = actionTraces;
        done();
    },
    start: async function (done) {
        await this.addActionTraces(this.actionTraces);
        done(false);
    },
    stop: async function (done) {
        await this._stop();
        done(false);
    },

    addActionTraces: async function (actionTraces) {
        for (let actionTrace of actionTraces) {
            const { query, outputKey } = actionTrace;
            const subscription = await this.listener.actionSubscription(actionTrace);
            console.log(`Subscribing Traces, query:${query} outputKey:${outputKey}`);

            /* setTimeout(() => {
                console.log(`OutputKey: ${outputKey}`);
                this.output(outputKey, 'test');
            }, 1000); */
            subscription.subscribe({
                next: data => {
                    //console.log(`OutputKey: ${outputKey}`, data);
                    this.output(outputKey, data);
                },
                error: error => logger.error(`Error occurred for subscription with query: ${query}`, error),
                complete: () => logger.info(`Completed! Subscription with query: ${query}`),
            });
        }
        console.log(`Finished Subscribing Traces`);
    },

    _stop: async function (closeConnection = true) {
        logger.info('Unlistening for EOS events...');
        const actionTraces = this.getIndividualActionTraces();
        const tableListeners = await this.getIndividualTableListeners();
        logger.info('Unlistening Action Traces...');
        this.unlisten(actionTraces);
        logger.info('Unlistening Table Listeners...');
        this.unlisten(tableListeners);
        logger.info('Finished unlistening. Waiting for processing of messages to finish...');

        this.actionTraces = [];
        this.tableListeners = [];

        if (closeConnection) {
            await this.disconnect();
        }
        this.output('progress', {
            actionTraces: actionTraces,
            tableListeners: tableListeners,
        });

    },
});