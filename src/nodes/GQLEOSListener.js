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
        this.actionTraces = actionTraces;
        this.lastProcessedActions = await this._getLastProcessedActions(this.prefix);

        this.listener = new GQLEOSListener({
            apiKey,
            network,
            endpoint,
        });

        this.listener.on('disconnected', () => {
            for (let actionTrace of Object.values(this.actionTraces)) {
                actionTrace.subscription.unsubscribe();
            }
        });

        this.listener.on('reconnected', () => {
            this.addActionTraces();
        });

        done();
    },
    _getLastProcessedActions: async function (prefix) {
        console.log('Getting lastProcessedActions... Prefix: ', prefix);
        const value = await this.redis.get(prefix);
        console.log('Got lastProcessedActions:', value);
        return this.deserializeLastProcessedActions(value);
    },

    _storeLastProcessedActions: async function (prefix, lastProcessedActions) {
        console.log('Saving lastProcessedActions...', prefix, lastProcessedActions);
        await this.redis.set(prefix, this.serializeLastProcessedActions(lastProcessedActions));
        console.log('Saved lastProcessedActions.');
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
        await this.addActionTraces();
        done(false);
    },
    stop: async function (done) {
        logger.info('Stopping subscriptions...');
        this.listener.removeAllListeners();
        await this.listener.stop();
        await this._storeLastProcessedActions(this.prefix, this.lastProcessedActions);
        done(false);
    },

    addActionTraces: async function () {
        for (let actionTraceKey in this.actionTraces) {
            let actionTrace = this.actionTraces[actionTraceKey];
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

            actionTrace.subscription = subscription.subscribe({
                next: data => {
                    if (tp.shouldProcessAction(data)) {
                        logger.info(data.blockNum);
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