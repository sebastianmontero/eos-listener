const BaseDao = require('./BaseDao');


class TokenDAO extends BaseDao {
    constructor(snowflake) {
        super(snowflake);
    }

    async selectTokenId(tokenName) {
        return await this._selectId({ tokenName });
    }

    async _selectId({ tokenName }) {
        const rows = await this.snowflake.execute('SELECT token_id FROM token WHERE token_name = :1', [tokenName.toUpperCase()]);
        return rows.length ? rows[0].TOKEN_ID : null;
    }

    async _insert({ tokenName, accountId }) {
        await this.snowflake.execute(
            `INSERT INTO token (token_name, account_id)
             VALUES (?, ?)`,
            [tokenName.toUpperCase(), accountId]);
    }


    async selectById(tokenId) {
        const rows = await this.snowflake.execute('SELECT token_id, token_name, account_id FROM token WHERE token_id = :1', [tokenId]);
        return rows.length ? rows[0] : null;
    }


    async updateAccountId(tokenId, accountId) {
        await this.snowflake.execute('UPDATE token SET account_id = :1 WHERE token_id = :2', [accountId, tokenId]);
    }

    async _update({ id, accountId }) {
        if (accountId >= 0) {
            const token = await this.selectById(id);
            if (token.ACCOUNT_ID < 0) {
                await this.updateAccountId(id, accountId);
            }
        }
    }

    async insert(tokenName, accountId) {
        await this._insert({ tokenName, accountId });
    }

    async getTokenId(tokenName, accountId) {
        return await this._getId({ tokenName, accountId });
    }

}

module.exports = TokenDAO;