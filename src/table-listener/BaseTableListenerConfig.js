const { TableListenerModes } = require('../const');
const BlockProgress = require('../eos-listener/BlockProgress');

class BaseTableListenerConfig {
    /**
     * dappId or dappTableId must be specified
     * @param {*} param0 
      */
    constructor({
        dappId,
        dappTableId,
        dappTableDao,
    }) {
        this.dappId = dappId;
        this.dappTableId = dappTableId;
        this.tables = null;
        this.fieldsOfInterest = null;
        this.dappTableDao = dappTableDao;
        this.streamOptions = {
            fetch: false,
            listen: true,
            mode: TableListenerModes.HISTORY,
            tableId: null,
            serializeRowUpdates: false,
            with_progress: 20,
        };
    }

    getStreamOptions(afterReconnect = false) {
        let streamOptions = this.streamOptions;
        if (afterReconnect) {
            streamOptions = {
                ...streamOptions,
                fetch: false
            }
        }
        return streamOptions;
    }

    async _getDappTableListeners() {
        const dappTables = this.dappId ? await this.dappTableDao.selectByDappIdWithProgress(this.dappId) : await this.dappTableDao.selectWithProgress(this.dappTableId);
        let listeners = [];
        for (let dappTable of dappTables) {
            listeners.push({
                dappTableId: dappTable.dapp_table_id,
                codeAccountId: dappTable.code_account_id,
                code: dappTable.code_account_name,
                scope: dappTable.scope_account_name,
                table: dappTable.dapp_table_name,
                blockProgress: new BlockProgress(dappTable.block_progress),
            });
        }
        return listeners;
    }

    async getTables() {
        if (!this.tables) {
            this.tables = await this._getDappTableListeners();
        }
        return this.tables;
    }

}

module.exports = BaseTableListenerConfig;
