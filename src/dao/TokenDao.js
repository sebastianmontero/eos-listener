const BaseDao = require('./BaseDao');


class TokenDAO extends BaseDao {
    constructor(dbCon) {
        super(dbCon);
    }

    async selectTokenId(tokenName) {
        return await this._selectId({ tokenName });
    }

    async _selectId({ tokenName }) {
        const [rows] = await this.dbCon.execute('SELECT token_id FROM token WHERE token_name = ?', [tokenName.toUpperCase()]);
        return rows.length ? rows[0].TOKEN_ID : null;
    }

    async _insert({ tokenName, accountId }) {
        const [result] = await this.dbCon.execute(
            `INSERT INTO token (token_name, account_id)
             VALUES (?, ?)`,
            [tokenName.toUpperCase(), accountId]);
        return result;
    }


    async selectById(tokenId) {
        const [rows] = await this.dbCon.execute(
            `SELECT token_id, 
                    token_name, 
                    account_id 
            FROM token 
            WHERE token_id = ?`,
            [tokenId]);
        return rows.length ? rows[0] : null;
    }


    async update(tokenId, accountId) {
        await this.dbCon.execute(
            `UPDATE token 
             SET account_id = ? 
             WHERE token_id = ?`,
            [accountId, tokenId]);
    }

    async _update({ id, accountId }) {
        if (accountId >= 0) {
            const token = await this.selectById(id);
            if (token.ACCOUNT_ID < 0) {
                await this.update(id, accountId);
            }
        }
    }

    async insert(tokenName, accountId) {
        return await this._insert({ tokenName, accountId });
    }

    async getTokenId(tokenName, accountId) {
        return await this._getId({ tokenName, accountId });
    }

}

module.exports = TokenDAO;