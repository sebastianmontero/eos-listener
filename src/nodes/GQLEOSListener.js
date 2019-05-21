const straw = require('@smontero/straw');
const { GQLEOSListener } = require('@smontero/eos-listener-gql');
const TraceProgress = require('../eos-listener/TraceProgress');
const Logger = require('../Logger');
const { logger } = Logger;

module.exports = straw.node({
    initialize: async function (opts, done) {
        this.opts = opts;
        this.redis = opts.redis.client;
        this.prefix = opts.redis.prefix;
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
        this.lastProcessedActions = await this._getLastProcessedActions(this.prefix);
        done();
    },
    _getLastProcessedActions: function (prefix) {
        console.log('Getting lastProcessedActions... Prefix: ', prefix);
        return new Promise((resolve, reject) => {
            this.redis.get(prefix, (err, reply) => {
                if (err) {
                    console.log('Error getting lastProcessedActions:', err);
                    reject(err);
                    return;
                } else {
                    console.log('Got lastProcessedActions:', reply);
                    resolve(this.deserializeLastProcessedActions(reply));
                }
            });
        });
    },

    _storeLastProcessedActions: function (prefix, lastProcessedActions) {
        console.log('Saving lastProcessedActions...', prefix, lastProcessedActions);
        return new Promise((resolve, reject) => {
            this.redis.set(prefix, this.serializeLastProcessedActions(lastProcessedActions), (err) => {
                if (err) {
                    console.log('Error storing lastProcessedActions:', err);
                    reject(err);
                    return;
                } else {
                    console.log('Saved lastProcessedActions.');
                    resolve();
                }
            });
        });
    },

    serializeLastProcessedActions() {
        return JSON.stringify(this.lastProcessedActions);
    },

    deserializeLastProcessedActions(serializedState) {
        let state = serializedState ? JSON.parse(serializedState) : {};
        for (let key in state) {
            state[key] = new TraceProgress(state[key]);
        }
        return state;
    },

    start: async function (done) {
        await this.addActionTraces(this.actionTraces);
        done(false);
    },
    stop: async function (done) {
        logger.info('Stopping subscriptions...');
        await this.listener.stop();
        await this._storeLastProcessedActions(this.prefix, this.lastProcessedActions);
        done(false);
    },

    addActionTraces: async function (actionTraces) {
        for (let actionTraceKey in actionTraces) {
            let actionTrace = actionTraces[actionTraceKey];
            const { query, outputKey, blockNum, actionSeq } = actionTrace;
            if (!this.lastProcessedActions[actionTraceKey]) {
                this.lastProcessedActions[actionTraceKey] = new TraceProgress({
                    blockNum,
                    actionSeq,
                });
            }
            const tp = this.lastProcessedActions[actionTraceKey];
            const subscription = await this.listener.actionSubscription({
                ...actionTrace,
                ...tp.getState(),
            });
            console.log(`Subscribing Traces, query:${query} outputKey:${outputKey} Trace progress: ${tp.getState()}`);

            subscription.subscribe({
                next: data => {
                    console.log(data);
                    if (tp.shouldProcessAction(data)) {
                        this.output(outputKey, data);
                        tp.processedAction(data);
                    }
                },
                error: error => logger.error(`Error occurred for subscription with query: ${query}`, error),
                complete: () => logger.info(`Completed! Subscription with query: ${query}`),
            });
        }
        console.log(`Finished Subscribing Traces`);
    },
});