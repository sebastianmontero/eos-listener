const { Api, JsonRpc } = require('eosjs');
const fetch = require('node-fetch');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const { getTypesFromAbi, createInitialTypes, hexToUint8Array, SerialBuffer } = require('eosjs/dist/eosjs-serialize');
const { TextEncoder, TextDecoder } = require('util');


class HexDecoder {

    constructor(endpoint) {
        this._abiMap = {};
        this._typeMap = {};
        this._eosJsApi = new Api({
            rpc: new JsonRpc(endpoint, { fetch, }),
            signatureProvider: new JsSignatureProvider([]),
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder()
        });
    }

    async addType(codeAccount, type) {
        this.getType(codeAccount, type);
    }

    async getType(codeAccount, type) {
        let typePath = this._getTypePath(codeAccount, type);

        if (!this._typeMap[typePath]) {
            let abiTypes = await this._getAbiTypes(codeAccount);
            let abiType = abiTypes.get(type);
            if (!abiType) {
                throw new Error(`Non existant type: ${codeAccount}/${type}`);
            }
            this._typeMap[typePath] = abiType;
        }
        return this._typeMap[typePath];

    }

    async _getTypePath(codeAccount, type) {
        return `${codeAccount}/${type}`;
    }

    async _getAbiTypes(codeAccount) {
        if (!this._abiMap[codeAccount]) {
            const abi = await this._eosJsApi.getAbi(codeAccount);
            const builtinTypes = createInitialTypes();
            this._abiMap[codeAccount] = getTypesFromAbi(builtinTypes, abi);
        }
        return this._abiMap[codeAccount];
    }

    async hexToJson(codeAccount, type, hexData) {
        let abiType = this.getType(codeAccount, type);
        const data = hexToUint8Array(hexData);

        const buffer = new SerialBuffer({
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder()
        });
        buffer.pushArray(data);
        return abiType.deserialize(buffer);
    }

}

module.exports = HexDecoder;