const WebSocket = require('ws');
const { EoswsClient, createEoswsSocket, InboundMessageType } = require('@dfuse/eosws-js');
const Util = require('./Util');

class EOSListener {
    constructor({
        eoswsToken,
        origin,
        eoswsEndpoint,
    }) {
        this.client = new EoswsClient(
            createEoswsSocket(() =>
                new WebSocket(`wss://${eoswsEndpoint}/v1/stream?token=${eoswsToken}`, { origin })
            )
        );
    }

    async addActionTraces({
        actionTraces,
        actionFilters,
        callbackFn,
        memoJsonKeyDictionary,
        streamOptions = {}
    }) {
        try {
            await this.client.connect();
        } catch (error) {
            console.log("Error connect:", error);
        }
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

                            //console.log("--------------DATA------------");
                            //console.log(data);
                            let payload = {
                                action,
                                actionData,
                                account,
                                message
                            };
                            if ('memo' in actionData) {
                                //console.log(" MEMO: ", actionData.memo);
                                const memoJson = this.extractJson(actionData.memo);
                                if (memoJson) {
                                    payload['memoJson'] = memoJson;
                                    if (memoJsonKeyDictionary) {
                                        payload['parsedMemo'] = this.interpretJson(memoJson, memoJsonKeyDictionary);
                                    }
                                }
                            }
                            console.log("Payload: ", payload);
                            callbackFn(payload);
                        }
                    }
                } catch (error) {
                    console.log("Error inside action trace: ", error);
                }
            });

        });
    }


    extractJson(value) {
        let valueJson = value.substring(value.indexOf('{'), value.lastIndexOf('}') + 1);
        valueJson = valueJson.replace(/'/g, '"');
        let jsonObj = null;
        if (valueJson) {
            jsonObj = JSON.parse(valueJson);
        } else {
            jsonObj = this.parse(valueJson);
        }

        return Util.isEmptyObj(jsonObj) ? null : jsonObj;
    }

    parse(str) {
        let pos = -1;
        let obj = {};
        while ((pos = str.indexOf(':', pos + 1)) != -1) {
            this.parseKeyValue(str, pos, obj);
            pos++;
        }
        return obj;
    }

    parseKeyValue(str, assignCharPos, obj) {
        let pos = this.lastIndexOf(str, [' '], assignCharPos - 1, true);
        let key = '', value = '';
        if (pos >= 0) {
            let searchChars = null;
            let endPos = pos;
            let char = str.charAt(pos);
            if (['"', "'"].indexOf(char) != -1) {
                searchChars = [char];
            } else {
                searchChars = [' ', ',', ':'];
                endPos++;
            }
            let startPos = this.lastIndexOf(str, searchChars, endPos - 1) + 1;
            key = str.substring(startPos, endPos);
        }
        if (!key) {
            return false;
        }

        pos = this.indexOf(str, [' '], assignCharPos + 1, true);
        if (pos >= 0) {
            let searchChars = null;
            let startPos = pos;
            let char = str.charAt(pos);
            if (['"', "'"].indexOf(char) != -1) {
                searchChars = [char];
                startPos++;
            } else {
                searchChars = [' ', ',', ':'];
            }
            let endPos = this.indexOf(str, searchChars, startPos);
            if (endPos == -1) {
                endPos = str.length;
            }
            value = str.substring(startPos, endPos);
        }
        obj[key] = value;
        return true;
    }

    found(str, chars, pos, not = false) {
        let foundChar = chars.indexOf(str.charAt(pos)) > -1;
        return ((foundChar && !not) || (!foundChar && not));
    }

    indexOf(str, chars, pos, not = false) {
        for (let i = pos; i < str.length; i++) {
            if (this.found(str, chars, i, not)) {
                return i;
            }
        }
        return -1;
    }

    lastIndexOf(str, chars, pos, not = false) {
        for (let i = pos; i >= 0; i--) {
            if (this.found(str, chars, i, not)) {
                return i;
            }
        }
        return -1;
    }

    interpretJson(jsonValue, keyDictionary) {
        let readData = {};
        for (let property in keyDictionary) {
            const { colName, keys } = keyDictionary[property];
            readData[colName] = this.interpretKey(keys, jsonValue);
        }
        return readData;
    }

    interpretKey(keys, jsonValue) {
        for (let key of keys) {
            if (key in jsonValue) {
                return jsonValue[key];
            }
        }
        return null;
    }
}

module.exports = EOSListener;