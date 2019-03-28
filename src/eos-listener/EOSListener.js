const WebSocket = require('ws');
const EventEmitter = require('events');
const { EoswsClient, createEoswsSocket, InboundMessageType } = require('@dfuse/eosws-js');
const { logger } = require('../Logger');
const { DBOps, ForkSteps, TableListenerModes } = require('../const');
const { Util } = require('../util');
const Lock = require('../lock/Lock');
const TokenManager = require('./TokenManager');
const { EOSHTTPService } = require('../service');


class EOSListener extends EventEmitter {
    constructor({
        eoswsAPIKey,
        eoswsAuthUrl,
        eoswsAuthTimeBuffer,
        origin,
        eoswsEndpoint,
        useBlockProgress = true,
    }) {
        super();
        this._useBlockProgress = useBlockProgress;
        this._addedActionTraces = [];
        this._addedTableListeners = [];
        this._actionMsgsInProcess = 0;
        this._tableMsgsInProcess = 0;
        this._origin = origin;
        this._eoswsEndpoint = eoswsEndpoint;
        this._tokenManager = new TokenManager({
            apiKey: eoswsAPIKey,
            authUrl: eoswsAuthUrl,
            timeBuffer: eoswsAuthTimeBuffer,
        });
        this.client = null;
        this.reconnect = true;
    }

    async _createClient() {

        const eoswsToken = await this._tokenManager.getToken();
        const eoswsEndpoint = this._eoswsEndpoint;
        const origin = this._origin;
        return new EoswsClient(
            createEoswsSocket(() =>
                new WebSocket(`wss://${eoswsEndpoint}/v1/stream?token=${eoswsToken}`, { origin, maxPayload: 1024 * 1024 * 1024 }),
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
                        logger.error('Adding action traces...');
                        for (let actionTrace of this._addedActionTraces) {
                            this._addActionTraces(actionTrace);
                        }
                        logger.error('Adding table listeners...');
                        for (let tableListener of this._addedTableListeners) {
                            this._addTableListeners(tableListener, true);
                        }
                    },
                    onInvalidMessage: (message) => {
                        logger.error('On Socket invalid message', message);
                    },
                }
            )
        );
    }

    async connect() {
        try {
            this.reconnect = true;
            if (!this.client) {
                logger.info('Client not created. Creating...');
                this.client = await this._createClient();
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
    }

    async disconnect() {
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
    }


    async addActionTraces({
        actionTraces,
        actionFilters,
        callbackFn,
    }) {
        const listenerConfig = {
            actionTraces,
            actionFilters,
            callbackFn,
        };

        this._addedActionTraces.push(listenerConfig);
        await this._addActionTraces(listenerConfig);
    }

    async _addActionTraces({
        actionTraces,
        actionFilters,
        callbackFn,
    }) {
        actionFilters = actionFilters || {};
        actionTraces.forEach(actionTrace => {
            let { actionId, codeAccountId, blockProgress, streamOptions } = actionTrace;
            if (this._useBlockProgress) {
                streamOptions.start_block = blockProgress.getStartBlock(streamOptions.start_block);
            }
            logger.info(`Stream options. Account:${actionTrace.account}`, streamOptions);
            actionTrace.listener = this.client.getActionTraces(actionTrace, streamOptions);
            actionTrace.listener.onMessage(async (message) => {
                try {
                    this._actionMsgsInProcess++;
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
                            let { block_num, block_time, trx_id, idx } = message.data;
                            const blockInfo = {
                                blockNum: block_num,
                                trxId: trx_id,
                                idx: idx
                            };
                            if (!blockProgress.shouldProcessBlock(blockInfo)) {
                                logger.info(`Processed block. Account: ${account}`, blockInfo);
                                return;
                            }
                            block_time = new Date(block_time);
                            let payload = {
                                actionId,
                                codeAccountId,
                                action,
                                actionData,
                                account,
                                block_num,
                                block_time,
                                message
                            };
                            logger.debug('Payload', payload);

                            await callbackFn(payload);
                            blockProgress.processedBlock(blockInfo);
                        }
                    } else if (message.type == InboundMessageType.PROGRESS) {
                        const { data: { block_num } } = message;
                        blockProgress.processedBlock({
                            blockNum: block_num
                        });
                    }
                } catch (error) {
                    logger.error(error);
                } finally {
                    this._actionMsgsInProcess--;
                    this._messageProcessed();
                }
            });

        });
    }
    _messageProcessed() {
        if (!this._areMsgsInProcess()) {
            this.emit('no-msgs-in-process');
        }
    }

    _areMsgsInProcess() {
        return this._actionMsgsInProcess > 0 || this._tableMsgsInProcess > 0
    }

    _unlisten(objs) {
        for (let obj of objs) {
            obj.listener.unlisten()
        }
    }

    _getIndividualActionTraces() {
        let traces = [];
        for (let actionTrace of this._addedActionTraces) {
            traces = traces.concat(actionTrace.actionTraces);
        }
        return traces;
    }

    async _getIndividualTableListeners() {
        let tables = [];
        for (let tableListener of this._addedTableListeners) {
            tables = tables.concat(await tableListener.getTables());
        }
        return tables;
    }

    async _unlistenAll() {
        this._unlistenActionTraces();
        await this._unlistenTableListeners();
    }

    async stop(closeConnection = true) {
        logger.info('Unlistening for EOS events...');
        const actionTraces = this._getIndividualActionTraces();
        const tableListeners = await this._getIndividualTableListeners();
        logger.info('Unlistening Action Traces...');
        this._unlisten(actionTraces);
        logger.info('Unlistening Table Listeners...');
        this._unlisten(tableListeners);
        logger.info('Finished unlistening. Waiting for processing of messages to finish...');

        this._addedActionTraces = [];
        this._addedTableListeners = [];

        return new Promise((resolve) => {
            const onProcessingFinished = async () => {
                logger.info('All EOS messages have been processed.');
                if (closeConnection) {
                    await this.disconnect();
                }
                resolve({
                    actionTraces: actionTraces,
                    tableListeners: tableListeners,
                });
            }
            if (this._areMsgsInProcess()) {
                logger.info(`${this._actionMsgsInProcess} action trace messages in process. ${this._tableMsgsInProcess} table messages in process.`);
                this.once('no-msgs-in-process', onProcessingFinished);
            } else {
                onProcessingFinished();
            }
        });

    }

    async addTableListeners(listenerObj) {

        this._addedTableListeners.push(listenerObj);
        await this._addTableListeners(listenerObj);
    }

    async _addTableListeners(listenerObj, afterReconnect = false) {
        let tables = await listenerObj.getTables();
        logger.info('Table listeners: ', tables);
        const { fieldsOfInterest } = listenerObj;
        tables.forEach(table => {
            const { codeAccountId, dappTableId, blockProgress } = table;
            let streamOptions = listenerObj.getStreamOptions(afterReconnect);
            if (this._useBlockProgress) {
                streamOptions.start_block = blockProgress.getStartBlock(streamOptions.start_block);
            }
            logger.info(`StreamOptions. DappTableId: ${dappTableId}.`, streamOptions);
            let processDeltas = true;
            let processedSnapshot = true;
            let msgBuffer, lockStore = {};
            const { fetch, tableId, mode } = streamOptions;
            let serializeRowUpdates = streamOptions.serializeRowUpdates && tableId;
            if (fetch) {
                processDeltas = false;
                processedSnapshot = false;
                msgBuffer = [];
            }

            const processMessage = async message => {
                try {
                    this._tableMsgsInProcess++;
                    if (message.type == InboundMessageType.TABLE_SNAPSHOT) {
                        const { data, data: { rows } } = message;
                        logger.info(`Number of rows in table snapshot: ${rows.length}. DappTableId: ${dappTableId}.`);
                        const promise = listenerObj.snapshot({
                            data,
                            codeAccountId,
                            dappTableId,
                            rows: rows.map(row => row.json),
                            message,
                            step: ForkSteps.NEW,
                        });
                        processDeltas = true;
                        await promise;
                        processedSnapshot = true;
                        this.emit('on-table-snapshot-processed', dappTableId);
                        logger.info(`Processed Snapshot. Msg buffer size: ${msgBuffer.length}. Processing msg buffer...DappTableId: ${dappTableId}.`);
                        for (let msg of msgBuffer) {
                            processMessage(msg);
                        }
                        logger.info(`Finished processing buffer.DappTableId: ${dappTableId}.`);
                    } else if (message.type == InboundMessageType.TABLE_DELTA && processDeltas) {
                        if (!processedSnapshot) {
                            msgBuffer.push(message);
                            return;
                        }
                        const { data, data: { block_num, step, dbop, dbop: { op, action_idx } } } = message;
                        const oldRow = dbop.old && dbop.old.json;
                        const newRow = dbop.new && dbop.new.json;
                        let modifiedProps = null;
                        const id = newRow ? newRow[tableId] : oldRow[tableId];
                        const blockInfo = {
                            blockNum: block_num,
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

                        try {
                            if (serializeRowUpdates) {
                                if (!lockStore[id]) {
                                    lockStore[id] = new Lock();
                                }
                                await lockStore[id].acquire();
                            }

                            let payload = {
                                data,
                                step,
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
                                    await listenerObj.insert(payload);
                                } else if (op === DBOps.UPDATE) {
                                    logger.debug(`Update new o redo.DappTableId: ${dappTableId}. payload:`, payload);
                                    await listenerObj.update(payload);
                                } else if (op === DBOps.REMOVE && !isHistoryMode) {
                                    logger.debug(`Remove new o redo.DappTableId: ${dappTableId}. Payload:`, payload);
                                    await listenerObj.remove(payload);
                                }
                            } else if (step === ForkSteps.UNDO) {
                                if (op === DBOps.INSERT && !isHistoryMode) {
                                    logger.debug(`Insert undo.DappTableId: ${dappTableId}.Payload:`, payload);
                                    await listenerObj.insert(payload);
                                } else if (op === DBOps.UPDATE) {
                                    logger.debug(`Update undo.DappTableId: ${dappTableId}.Payload:`, payload);
                                    await listenerObj.update(payload);
                                } else if (op === DBOps.REMOVE) {
                                    logger.debug(`Remove undo.DappTableId: ${dappTableId}.Payload:`, payload);
                                    await listenerObj.remove(payload);
                                }
                            }
                            blockProgress.processedBlock(blockInfo);
                        } finally {
                            if (serializeRowUpdates) {
                                lockStore[id].release();
                                if (!lockStore[id].isInUse()) {
                                    delete lockStore[id];
                                }
                            }
                        }
                    } else if (message.type == InboundMessageType.PROGRESS && processDeltas) {
                        const { data: { block_num } } = message;
                        blockProgress.processedBlock({
                            blockNum: block_num
                        });
                    }
                } catch (error) {
                    logger.error(error);
                } finally {
                    this._tableMsgsInProcess--;
                    this._messageProcessed();
                }
            };
            table.listener = this.client.getTableRows({ ...table, json: true }, streamOptions);
            table.listener.onMessage(processMessage);

        });
    }


    async loadTableHistory(listener, startDate, endDate) {
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
    }

    async _loadDay(listener, blockNum, date) {
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
}

module.exports = EOSListener;