const straw = require('@smontero/straw');
const { GQLEOSListener } = require('@smontero/eos-listener-gql');
const Logger = require('../Logger');
const { logger } = Logger;

module.exports = straw.node({
    initialize: async function (opts, done) {
        this.opts = opts;
        this.redis = opts.redis.client;
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
        logger.info('Stopping subscriptions...');
        await this.listener.stop();
        done(false);
    },

    addActionTraces: async function (actionTraces) {
        for (let actionTraceKey in actionTraces) {
            let actionTrace = actionTraces[actionTraceKey];
            const { query, outputKey } = actionTrace;
            const subscription = await this.listener.actionSubscription(actionTrace);
            console.log(`Subscribing Traces, query:${query} outputKey:${outputKey}`);

            subscription.subscribe({
                next: data => {
                    this.output(outputKey, data);
                },
                error: error => logger.error(`Error occurred for subscription with query: ${query}`, error),
                complete: () => logger.info(`Completed! Subscription with query: ${query}`),
            });
        }
        console.log(`Finished Subscribing Traces`);
    },
});