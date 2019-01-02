
const BaseDao = require('./BaseDao');


class DappDAO extends BaseDao {
    constructor(dbCon) {
        super(dbCon);
    }

    async selectDappId(dappName) {
        return await this._selectId({ dappName });
    }

    async _selectId({ dappName }) {
        const [rows] = await this.dbCon.execute(
            'SELECT dapp_id FROM dapp WHERE dapp_name = ?',
            [dappName]
        );
        return rows.length ? rows[0].DAPP_ID : null;
    }

    async _insert({ dappName, dappTypeId }) {
        const [result] = await this.dbCon.execute(
            `INSERT INTO dapp (dapp_name, dapp_type_id)
             VALUES (?, ?)`,
            [dappName, dappTypeId]
        );
        return result;
    }

    async insert(dappName, dappTypeId) {
        return await this._insert({ dappName, dappTypeId });
    }

    async getDappId(dappName, dappTypeId) {
        return await this._getId({ dappName, dappTypeId });
    }

}

module.exports = DappDAO;