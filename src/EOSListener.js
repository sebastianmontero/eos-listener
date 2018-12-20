const WebSocket = require('ws');
const { EoswsClient, createEoswsSocket, InboundMessageType } = require('@dfuse/eosws-js');
const { logger } = require('./Logger');
const { DBOps, ForkSteps, TableListenerModes } = require('./const');


class EOSListener {
    constructor({
        eoswsToken,
        origin,
        eoswsEndpoint,
    }) {
        this._addedActionTraces = [];
        this._addedTableListeners = [];
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
                            this._addTableListeners(tableListener);
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
        streamOptions = {}
    }) {
        const listenerConfig = {
            actionTraces,
            actionFilters,
            callbackFn,
            streamOptions
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
        streamOptions = {}
    }) {
        actionTraces.forEach(actionTrace => {
            this.client.getActionTraces(actionTrace, streamOptions).onMessage((message) => {
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
                            let { block_num, block_time } = message.data;
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
                            callbackFn(payload);
                        }
                    }
                } catch (error) {
                    logger.error(error);
                }
            });

        });
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

    async _addTableListeners(listenerObj) {
        let tables = await listenerObj.getTables();
        logger.debug('Table listeners: ', tables);
        const { streamOptions } = listenerObj;
        tables.forEach(table => {
            const { dappTableId } = table;
            this.client.getTableRows({ ...table, json: true }, streamOptions).onMessage((message) => {
                try {
                    if (message.type == InboundMessageType.TABLE_DELTA) {
                        const { data, data: { step, dbop, dbop: { op } } } = message;
                        const { mode } = streamOptions;
                        let payload = {
                            data,
                            step,
                            dbop,
                            message,
                            dappTableId,
                            oldRow: dbop.old && dbop.old.json,
                            newRow: dbop.new && dbop.new.json,
                        };
                        const isHistoryMode = mode === TableListenerModes.HISTORY;
                        if (step === ForkSteps.NEW || step === ForkSteps.REDO) {
                            if (op === DBOps.INSERT) {
                                logger.debug('Insert new o redo:', payload);
                                listenerObj.insert(payload);
                            } else if (op === DBOps.UPDATE) {
                                logger.debug('Update new o redo:', payload);
                                listenerObj.update(payload);
                            } else if (op === DBOps.REMOVE && !isHistoryMode) {
                                logger.debug('Remove new o redo:', payload);
                                listenerObj.remove(payload);
                            }
                        } else if (step === ForkSteps.UNDO) {
                            if (op === DBOps.INSERT && !isHistoryMode) {
                                logger.debug('Insert undo:', payload);
                                listenerObj.insert(payload);
                            } else if (op === DBOps.UPDATE) {
                                logger.debug('Update undo:', payload);
                                listenerObj.update(payload);
                            } else if (op === DBOps.REMOVE) {
                                logger.debug('Remove undo:', payload);
                                listenerObj.remove(payload);
                            }
                        }
                    }
                } catch (error) {
                    logger.error(error);
                }
            });

        });
    }


}

module.exports = EOSListener;