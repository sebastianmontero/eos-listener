const WebSocket = require('ws');
const { EoswsClient, createEoswsSocket, InboundMessageType } = require('@dfuse/eosws-js');
const { logger } = require('../Logger');
const { DBOps, ForkSteps, TableListenerModes } = require('../const');
const { Util } = require('../util');
const Lock = require('../lock/Lock');


class EOSListener {
    constructor({
        eoswsToken,
        origin,
        eoswsEndpoint,
    }) {
        this._addedActionTraces = [];
        this._addedTableListeners = [];
        this._actionMsgsInProcess = 0;
        this._tableMsgsInProcess = 0;
        this.client = new EoswsClient(
            createEoswsSocket(() =>
                new WebSocket(`wss://${eoswsEndpoint}/v1/stream?token=${eoswsToken}`, { origin }),
                {
                    autoReconnect: true,
                    onError: (message) => {
                        logger.error('On Socket error', message);
                    },
                    onClose: () => {
                        logger.error('Connection with mainet has been closed. Waiting for reconnect to restablish listeners');
                    },
                    onInvalidMessage: (message) => {
                        logger.error('On Socket invalid message', message);
                    },
                    onReconnect: () => {
                        logger.error('Reconnected to mainet.');
                        logger.error('Adding action traces...');
                        for (let actionTrace of this._addedActionTraces) {
                            this._addActionTraces(actionTrace);
                        }
                        logger.error('Adding table listeners...');
                        for (let tableListener of this._addedTableListeners) {
                            this._addTableListeners(tableListener, true);
                        }
                    },
                }
            )
        );
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
        try {
            await this.client.connect();
            logger.info("Connected to mainet!");
        } catch (error) {
            logger.error(error);
        }
        this._addActionTraces(listenerConfig);
    }

    _addActionTraces({
        actionTraces,
        actionFilters,
        callbackFn,
    }) {
        actionTraces.forEach(actionTrace => {
            let { blockProgress, streamOptions } = actionTrace;
            streamOptions.start_block = blockProgress.getStartBlock(streamOptions.start_block);
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
                    }
                } catch (error) {
                    logger.error(error);
                } finally {
                    this._actionMsgsInProcess--;
                }
            });

        });
    }

    _unlisten(objs) {
        for (let obj of objs) {
            obj.listener.unlisten()
        }
    }

    _unlistenActionTraces() {
        logger.info('Unlistening action traces...');
        for (let actionTrace of this._addedActionTraces) {
            this._unlisten(actionTrace.actionTraces);
        }
    }

    async _unlistenTableListeners() {
        logger.info('Unlistening table listeners...');
        for (let tableListener of this._addedTableListeners) {
            this._unlisten(await tableListener.getTables());
        }
    }

    async _unlistenAll() {
        this._unlistenActionTraces();
        await this._unlistenTableListeners();
    }

    async stop() {
        logger.info('Unlistening action traces and table listeners...');
        await this._unlistenAll();
        logger.info('Finished unlistening.');
    }

    async addTableListeners(listenerObj) {


        this._addedTableListeners.push(listenerObj);
        try {
            await this.client.connect();
            logger.info("Connected to mainet!");
        } catch (error) {
            logger.error(error);
        }
        await this._addTableListeners(listenerObj);
    }

    async _addTableListeners(listenerObj, afterReconnect = false) {
        let tables = await listenerObj.getTables();
        logger.info('Table listeners: ', tables);
        const { fieldsOfInterest } = listenerObj;
        tables.forEach(table => {
            const { dappTableId, blockProgress } = table;
            const streamOptions = listenerObj.getStreamOptions(blockProgress, afterReconnect);
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
                            dappTableId,
                            rows: rows.map(row => row.json),
                            message,
                            step: ForkSteps.NEW,
                        });
                        processDeltas = true;
                        await promise;
                        processedSnapshot = true;
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
                    }
                } catch (error) {
                    logger.error(error);
                } finally {
                    this._tableMsgsInProcess--;
                }
            };
            table.listener = this.client.getTableRows({ ...table, json: true }, streamOptions);
            table.listener.onMessage(processMessage);

        });
    }
}

module.exports = EOSListener;