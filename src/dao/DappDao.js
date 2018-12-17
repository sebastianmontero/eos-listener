
const BaseDao = require('./BaseDao');


class DappDAO extends BaseDao {
    constructor(snowflake) {
        super(snowflake);
    }

    async selectDappId(dappName) {
        return await this._selectId({ dappName });
    }

    async _selectId({ dappName }) {
        const rows = await this.snowflake.execute(
            'SELECT dapp_id FROM dapp WHERE dapp_name = :1',
            [dappName]
        );
        return rows.length ? rows[0].DAPP_ID : null;
    }

    async _insert({ dappName, dappTypeId }) {
        await this.snowflake.execute(
            `INSERT INTO dapp (dapp_name, dapp_type_id)
             VALUES (?, ?)`,
            [dappName, dappTypeId]
        );
    }

    async insert(dappName, dappTypeId) {
        await this._insert({ dappName, dappTypeId });
    }

    async getDappId(dappName, dappTypeId) {
        return await this._getId({ dappName, dappTypeId });
    }

}

module.exports = DappDAO;