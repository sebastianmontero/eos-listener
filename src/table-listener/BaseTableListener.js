const { TableListenerModes } = require('../const');

class BaseTableListener {
    /**
     * dappId or dappTableId must be specified
     * @param {*} param0 
     */
    constructor({
        dappId,
        dappTableId,
        accountDao,
        tokenDao,
        dappTableDao,
    }) {
        this.dappId = dappId;
        this.dappTableId = dappTableId;
        this.tables = null;
        this.fieldsOfInterest = null;
        this.accountDao = accountDao;
        this.tokenDao = tokenDao;
        this.dappTableDao = dappTableDao;
        this.streamOptions = {
            fetch: false,
            listen: true,
            mode: TableListenerModes.HISTORY,
            tableId: null,
            serializeRowUpdates: false,
            with_progress: 5,
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
        const dappTables = this.dappId ? await this.dappTableDao.selectByDappId(this.dappId) : await this.dappTableDao.select(this.dappTableId);
        let listeners = [];
        for (let dappTable of dappTables) {
            listeners.push({
                dappTableId: dappTable.dapp_table_id,
                code: dappTable.code_account_name,
                scope: dappTable.scope_account_name,
                table: dappTable.dapp_table_name,
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

    async insert(payload) {
        throw new Error('Method must be overriden by subclass');
    }

    async update(payload) {
        throw new Error('Method must be overriden by subclass');
    }

    async remove(payload) {
        throw new Error('Method must be overriden by subclass');
    }

    async snapshot(payload) {
        throw new Error('Method must be overriden by subclass if fetch StreamOption is true.');
    }

}

module.exports = BaseTableListener;
