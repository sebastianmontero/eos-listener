const figlet = require('figlet');
const dbCon = require('./db/DBConnection');
const EOSListener = require('./eos-listener/EOSListener');
const BlockProgress = require('./eos-listener/BlockProgress');
const { Util, TimeUtil } = require('./util');
const { AccountTypeIds, SpecialValues, OrderTypeIds, DappTypeIds } = require('./const');
const { AccountDao, ActionDao, ActionBlockProgressDao, ChannelDao, DappDao, TokenDao, ExchangeTradeDao } = require('./dao');
const { logger } = require('./Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class GyftieTestDataLoader {
    constructor(config) {
        this.config = config;
        const {
            eoswsAPIKey,
            eoswsAuthUrl,
            eoswsAuthTimeBuffer,
            origin,
            eoswsEndpoint,
            useBlockProgress,
        } = config;

        this.listener = new EOSListener({
            eoswsAPIKey,
            eoswsAuthUrl,
            eoswsAuthTimeBuffer,
            origin,
            eoswsEndpoint,
            useBlockProgress,
        });

        this.baseStreamOptions = {
            with_progress: 20,
        };

    }

    printFiglet() {
        figlet('Loading Gyftie Test Data Loader', {
            font: "Big",
            horizontalLayout: 'default',
            verticalLayout: 'default'
        }, (err, data) => {
            if (err) {
                console.log('Something went wrong...');
                console.dir(err);
                return;
            }
            console.log(data)
            console.log("");
            console.log("----- Using Configuration ---- ")
            console.log(this.config);
            console.log("----- End Configuration ---- ")
            console.log("\n\n ")

        });
    }

    async _getActionTraces() {

        let actionTraces = [];
        actionTraces.push({
            actionId: 1,
            codeAccountId: 2,
            account: "gyftietokens",
            action_name: "nchallenge",
            with_inline_traces: true,
            with_dbops: true,
            json: true,
            streamOptions: { ...this.baseStreamOptions },
            blockProgress: new BlockProgress(),
        });
        actionTraces.push({
            actionId: 1,
            codeAccountId: 2,
            account: "gyftietokens",
            action_name: "validate",
            with_inline_traces: true,
            with_dbops: true,
            json: true,
            streamOptions: { ...this.baseStreamOptions },
            blockProgress: new BlockProgress(),
        });
        return actionTraces;
    }

    async _getActionFilters() {
        return {
            transfer: {
            }
        };
    }

    async start() {

        this.printFiglet();

        try {
            const actionTraces = await this._getActionTraces();
            logger.info("Action Traces:", actionTraces);
            const actionFilters = await this._getActionFilters();
            logger.info("Action Filters:", actionFilters);
            await this.listener.connect();
            this.listener.addActionTraces({
                actionTraces: actionTraces,
                actionFilters,
                callbackFn: async payload => {
                    const {
                        account,
                        action,
                        actionData: { to, from, quantity, memo },
                        block_time: blockTime,
                    } = payload;

                    try {
                        console.log(payload);
                    } catch (error) {
                        logger.error('Error processing payload.', error);
                        throw error;
                    }
                }
            });
        } catch (error) {
            logger.error('Error setting up the action trace listeners.', error);
        }
    }
    async stop() {
        const { actionTraces } = await this.listener.stop();
        logger.info('Flushing Exchange Data in batch to the database...');
        await this.exchangeTradeDao.flush();
        logger.info('Storing block progress for action traces...', actionTraces);
        const toInsert = actionTraces.map((actionTrace) => [
            actionTrace.actionId,
            actionTrace.blockProgress.serialize(),
        ]);
        const actionBlockProgressDao = new ActionBlockProgressDao(dbCon);
        await actionBlockProgressDao.insert(toInsert);
        logger.info('Stored block progress for action traces...', toInsert);
        await dbCon.end();
        logger.info('Closed database connection.');
    }
}

module.exports = GyftieTestDataLoader;
