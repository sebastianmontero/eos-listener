const WebSocket = require('ws');
const { EoswsClient, createEoswsSocket, InboundMessageType } = require('@dfuse/eosws-js');
const { logger } = require('./Logger');


class EOSListener {
    constructor({
        eoswsToken,
        origin,
        eoswsEndpoint,
    }) {
        this._addedActionTraces = [];
        const _self = this;
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
                        logger.error('Reconnected to mainet. Adding traces...');
                        for (let actionTrace in _self._addedActionTraces) {
                            _self._addActionTraces(actionTrace);
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
                            let payload = {
                                action,
                                actionData,
                                account,
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
}

module.exports = EOSListener;