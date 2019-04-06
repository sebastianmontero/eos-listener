const straw = require('straw');
const WebSocket = require('ws');
const { EoswsClient, createEoswsSocket, InboundMessageType } = require('@dfuse/eosws-js');
const Logger = require('../Logger');
const { logger } = Logger;
const { DBOps, ForkSteps, TableListenerModes } = require('../const');
const { Util } = require('../util');
const BlockProgress = require('../eos-listener/BlockProgress');
const TokenManager = require('../eos-listener/TokenManager');
const { EOSHTTPService } = require('../service');
const dbCon = require('../db/DBConnection');

module.exports = straw.node({
    initialize: function (opts, done) {
        this.opts = opts;
        const {
            config: {
                useBlockProgress,
                eoswsAPIKey,
                eoswsAuthUrl,
                eoswsAuthTimeBuffer,
                origin,
                db,
            },
            actionTraces,
            tableListeners,
        } = opts;

        Logger.configure('eos-event-listener');
        dbCon.init(db);

        this.useBlockProgress = useBlockProgress;
        this.actionTraces = actionTraces || [];
        this.tableListeners = tableListeners || [];
        console.log(this.actionTraces);
        this.preprocessListeners();
        console.log(this.actionTraces);
        this.origin = origin;
        this.tokenManager = new TokenManager({
            apiKey: eoswsAPIKey,
            authUrl: eoswsAuthUrl,
            timeBuffer: eoswsAuthTimeBuffer,
        });
        this.client = null;
        this.reconnect = true;
        done();
    },
    start: async function (done) {
        await this.connect();
        this.addListeners();
        done(false);
    },
    stop: async function (done) {
        await this._stop();
        done(false);
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
    preprocessListeners: function () {
        for (let actionTrace of this.actionTraces) {
            this.inflateBlockProgress(actionTrace.actionTraces);
        }
        this.inflateBlockProgress(this.tableListeners);
    },
    inflateBlockProgress: function (listeners) {
        for (let listener of listeners) {
            listener.blockProgress = new BlockProgress(listener.blockProgress);
        }
    },
    addListeners: function (afterReconnect = false) {
        logger.info('Adding action traces...');
        for (let actionTrace of this.actionTraces) {
            this.addActionTraces(actionTrace);
        }
        logger.info('Adding table listeners...');
        for (let tableListener of this.tableListeners) {
            this.addTableListeners(tableListener, afterReconnect);
        }
    },
    createClient: async function () {

        const eoswsToken = await this.tokenManager.getToken();
        const origin = this.origin;
        return new EoswsClient(
            createEoswsSocket(() =>
                new WebSocket(`wss://${this.opts.config.eoswsEndpoint}/v1/stream?token=${eoswsToken}`, { origin, maxPayload: 1024 * 1024 * 1024 }),
                {
                    autoReconnect: false,
                    onError: (message) => {
                        logger.error('On Socket error', message);
                    },
                    onClose: async () => {
                        if (!this.reconnect) {
                            return;
                        }
                        logger.error('Connection with mainet has been closed. Stopping current listeners...');
                        await this.stop(false);
                        this.client = null;
                        logger.error('Old listener stopped. Connecting new client...');
                        await this.connect();
                        logger.error('Re-adding listeners...');
                        this.addListeners(true);
                    },
                    onInvalidMessage: (message) => {
                        logger.error('On Socket invalid message', message);
                    },
                }
            )
        );
    },

    connect: async function () {
        try {
            this.reconnect = true;
            if (!this.client) {
                logger.info('Client not created. Creating...');
                this.client = await this.createClient();
            }
            if (!this.client.socket.isConnected) {
                logger.info('Client not connected. Connecting...');
                await this.client.connect();
                logger.info("Connected to mainet!");
            }
        } catch (error) {
            logger.error("An error ocurred while creating and connecting client.", error);
            throw error;
        }
    },

    disconnect: async function () {
        try {
            this.reconnect = false;
            if (this.client && this.client.socket.isConnected) {
                logger.info('Client connected. Disconnecting...');
                await this.client.disconnect();
                logger.info("Disconnected from mainet!");
            }
        } catch (error) {
            logger.error("An error ocurred while disconnecting client.", error);
            throw error;
        }
    },

    addActionTraces: async function ({
        actionTraces,
        actionFilters,
    }) {
        actionFilters = actionFilters || {};
        actionTraces.forEach(actionTrace => {
            let { actionId, codeAccountId, blockProgress, streamOptions, inlineTraces } = actionTrace;
            if (this.useBlockProgress) {
                streamOptions.start_block = blockProgress.getStartBlock(streamOptions.start_block);
            }
            logger.info(`Stream options. Account: ${actionTrace.account} Action: ${actionTrace.action_name}`, streamOptions);
            actionTrace.listener = this.client.getActionTraces(actionTrace, streamOptions);
            actionTrace.listener.onMessage(async (message) => {
                try {
                    if (message.type === InboundMessageType.ACTION_TRACE) {
                        const data = message.data.trace.act;
                        const {
                            name: action,
                            account,
                            data: actionData
                        } = data;

                        let passFilter = true;
                        if (action in actionFilters) {
                            const filter = actionFilters[action];
                            for (let filterKey in filter) {
                                const filterValues = Array.isArray(filter[filterKey]) ? filter[filterKey] : [filter[filterKey]];
                                if (filterValues.indexOf(actionData[filterKey]) == -1) {
                                    passFilter = false;
                                }
                            }
                        }

                        if (passFilter) {
                            let { block_num: blockNum, block_time: blockTime, trx_id: trxId, idx } = message.data;
                            console.log(`blockTime: ${blockTime} blockNum: ${blockNum}`);
                            const blockInfo = {
                                blockNum,
                                trxId,
                                idx
                            };
                            if (!blockProgress.shouldProcessBlock(blockInfo)) {
                                logger.info(`Processed block. Account: ${account}`, blockInfo);
                                return;
                            }
                            blockTime = new Date(blockTime);
                            const inlineTraceResults = this.extractInlineTraces(message.data, inlineTraces);
                            let payload = {
                                actionId,
                                codeAccountId,
                                action,
                                actionData,
                                account,
                                blockNum,
                                blockTime,
                                message,
                                inlineTraceResults
                            };
                            logger.debug('Payload', payload);

                            this.output(payload);
                            blockProgress.processedBlock(blockInfo);
                        }
                    } else if (message.type == InboundMessageType.PROGRESS) {
                        const { data: { block_num: blockNum } } = message;
                        console.log(message);
                        blockProgress.processedBlock({
                            blockNum,
                        });
                    }
                } catch (error) {
                    logger.error(error);
                }
            });

        });
    },

    extractInlineTraces: function (data, search) {
        let results = {};
        let foundDigests = {};

        if (search) {
            let { trace: { inline_traces } } = data;
            this.searchInlineTraces(inline_traces, search, results, foundDigests, []);
        }
        return results;
    },

    searchInlineTraces: function (traces, search, results, foundDigests, path) {
        for (let trace of traces) {
            this.findInlineTraces(trace, search, results, foundDigests, Util.cloneArray(path));
        }
        return results;
    },

    findInlineTraces: function (trace, search, results, foundDigests, path) {

        const { receipt: { act_digest }, act, act: { account, name: action }, inline_traces } = trace;
        for (const key in search) {
            const { account: qAccount, action: qAction, path: qPath } = search[key];
            if (qAccount == account && qAction == action) {
                if (foundDigests[act_digest] || (qPath && !this.pathsMatch(path, qPath))) {
                    continue;
                }
                foundDigests[act_digest] = true;
                if (!results[key]) {
                    results[key] = [];
                }
                results[key].push(act);
            }
        }
        path.push(`${account}-${action}`);
        this.searchInlineTraces(inline_traces, search, results, foundDigests, path);
    },

    pathsMatch: function (path, qPath) {
        let i1 = path.length;
        let i2 = qPath.length;
        if (i1 < i2) {
            return false;
        }
        while (i2 >= 0) {
            i1--;
            i2--;
            let pathEl = path[i1];
            let qPathEls = qPath[i2];
            qPathEls = Array.isArray(qPathEls) ? qPathEls : [qPathEls];
            if (!qPathEls.some(element => pathEl == element)) {
                return false;
            }
        }
        return true;
    },

    unlisten: function (objs) {
        for (let obj of objs) {
            obj.listener.unlisten()
        }
    },

    getIndividualActionTraces: function () {
        let traces = [];
        for (let actionTrace of this.actionTraces) {
            traces = traces.concat(actionTrace.actionTraces);
        }
        return traces;
    },

    getIndividualTableListeners: async function () {
        let tables = [];
        for (let tableListener of this.tableListeners) {
            tables = tables.concat(await tableListener.getTables());
        }
        return tables;
    },

    addTableListeners: async function (listenerObj, afterReconnect = false) {
        let tables = await listenerObj.getTables();
        logger.info('Table listeners: ', tables);
        const { fieldsOfInterest } = listenerObj;
        tables.forEach(table => {
            const { codeAccountId, dappTableId, blockProgress } = table;
            let streamOptions = listenerObj.getStreamOptions(afterReconnect);
            console.log('Stream options: ', streamOptions);
            if (this.useBlockProgress) {
                streamOptions.start_block = blockProgress.getStartBlock(streamOptions.start_block);
            }
            logger.info(`StreamOptions. DappTableId: ${dappTableId}.`, streamOptions);

            const { tableId, mode } = streamOptions;

            const processMessage = message => {
                try {
                    const { type, data } = message;
                    if (type == InboundMessageType.TABLE_SNAPSHOT) {
                        const { rows } = data;
                        logger.info(`Number of rows in table snapshot: ${rows.length}. DappTableId: ${dappTableId}.`);
                        /* const promise = listenerObj.snapshot({
                            data,
                            codeAccountId,
                            dappTableId,
                            rows: rows.map(row => row.json),
                            message,
                            step: ForkSteps.NEW,
                        });
                        await promise; */
                        this.output({
                            type,
                            data,
                            codeAccountId,
                            dappTableId,
                            rows: rows.map(row => row.json),
                            message,
                            step: ForkSteps.NEW,
                        });
                        //this.emit('on-table-snapshot-processed', dappTableId);
                    } else if (type == InboundMessageType.TABLE_DELTA) {
                        const { block_num: blockNum, step, dbop, dbop: { op, action_idx } } = data;
                        const oldRow = dbop.old && dbop.old.json;
                        const newRow = dbop.new && dbop.new.json;
                        let modifiedProps = null;
                        const id = newRow ? newRow[tableId] : oldRow[tableId];
                        const blockInfo = {
                            blockNum,
                            trxId: id,
                            idx: action_idx
                        };
                        if (!blockProgress.shouldProcessBlock(blockInfo)) {
                            logger.info(`Processed block.DappTableId: ${dappTableId}`, blockInfo);
                            return;
                        }

                        if (op === DBOps.UPDATE) {
                            modifiedProps = Util.modifiedProps(oldRow, newRow, fieldsOfInterest);
                            if (!modifiedProps) {
                                return;
                            }
                        }

                        let payload = {
                            type,
                            data,
                            step,
                            op,
                            dbop,
                            message,
                            codeAccountId,
                            dappTableId,
                            oldRow,
                            newRow,
                            modifiedProps,
                        };
                        const isHistoryMode = mode === TableListenerModes.HISTORY;
                        if (step === ForkSteps.NEW || step === ForkSteps.REDO) {
                            if (op === DBOps.INSERT) {
                                logger.debug(`Insert new o redo.DappTableId: ${dappTableId}. payload:`, payload);
                                //await listenerObj.insert(payload);
                            } else if (op === DBOps.UPDATE) {
                                logger.debug(`Update new o redo.DappTableId: ${dappTableId}. payload:`, payload);
                                //await listenerObj.update(payload);
                            } else if (op === DBOps.REMOVE && !isHistoryMode) {
                                logger.debug(`Remove new o redo.DappTableId: ${dappTableId}. Payload:`, payload);
                                //await listenerObj.remove(payload);
                            }
                        } else if (step === ForkSteps.UNDO) {
                            if (op === DBOps.INSERT && !isHistoryMode) {
                                logger.debug(`Insert undo.DappTableId: ${dappTableId}.Payload:`, payload);
                                //await listenerObj.insert(payload);
                            } else if (op === DBOps.UPDATE) {
                                logger.debug(`Update undo.DappTableId: ${dappTableId}.Payload:`, payload);
                                //await listenerObj.update(payload);
                            } else if (op === DBOps.REMOVE) {
                                logger.debug(`Remove undo.DappTableId: ${dappTableId}.Payload:`, payload);
                                //await listenerObj.remove(payload);
                            }
                        }
                        this.output(payload);
                        blockProgress.processedBlock(blockInfo);

                    } else if (type == InboundMessageType.PROGRESS) {
                        const { block_num: blockNum } = data;
                        blockProgress.processedBlock({
                            blockNum,
                        });
                    }
                } catch (error) {
                    logger.error(error);
                }
            };
            table.listener = this.client.getTableRows({ ...table, json: true }, streamOptions);
            table.listener.onMessage(processMessage);

        });
    },


    loadTableHistory: async function (listener, startDate, endDate) {
        let dailyBlockNumbers = await EOSHTTPService.getDailyBlockNumbers(startDate, endDate);
        console.log(dailyBlockNumbers);
        let { streamOptions } = listener;
        streamOptions.fetch = true;
        streamOptions.listen = false;
        await this.connect();

        for (let dailyBlockNumber of dailyBlockNumbers) {
            const { blockNum, blockDate } = dailyBlockNumber;
            await this._loadDay(listener, blockNum, blockDate);
            await this.stop(false);
        }
        await this.disconnect();
    },

    _loadDay: async function (listener, blockNum, date) {
        logger.info(`Loading table data for blockNum: ${blockNum} and date: ${date} ...`);
        return new Promise((resolve) => {
            let { streamOptions } = listener;
            streamOptions.start_block = blockNum;
            this.addTableListeners(listener);
            this.once('on-table-snapshot-processed', async () => {
                await listener.takeSnapshot(date);
                resolve();
            });
        });
    }
});