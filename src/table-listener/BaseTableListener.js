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
        this.accountDao = accountDao;
        this.tokenDao = tokenDao;
        this.dappTableDao = dappTableDao;
        this.streamOptions = { fetch: false, listen: true, mode: TableListenerModes.HISTORY };
    }

    async _getDappTableListeners() {
        const dappTables = this.dappId ? await this.dappTableDao.selectByDappId(this.dappId) : await this.dappTableDao.select(this.dappTableId);
        let listeners = [];
        for (let dappTable of dappTables) {
            listeners.push({
                dappTableId: dappTable.DAPP_TABLE_ID,
                code: dappTable.CODE_ACCOUNT_NAME,
                scope: dappTable.SCOPE_ACCOUNT_NAME,
                table: dappTable.DAPP_TABLE_NAME,
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

}

module.exports = BaseTableListener;
