

class AuthTokenDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert(values) {

        await this.dbCon.execute(
            `INSERT INTO auth_token(
                auth_token_id,
                token,
                expires_at
            ) VALUES (1, ?, ?)
            ON DUPLICATE KEY UPDATE 
            token = VALUES(token),
            expires_at = VALUES(expires_at)`,
            values);
    }

    async select() {

        return await this.dbCon.singleRow(
            `SELECT token,
                    expires_at
             FROM auth_token`);
    }

}

module.exports = AuthTokenDAO;