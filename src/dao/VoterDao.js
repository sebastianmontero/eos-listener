
class VoterDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert(values) {
        await this.dbCon.insertBatch(
            `INSERT IGNORE INTO voter(
                account_id,
                is_proxy
            ) VALUES ?`,
            values);
    }

    async count() {
        return await this.dbCon.singleValue(
            `SELECT COUNT(*)
             FROM voter`);
    }

    async delete(accountId) {
        await this.dbCon.execute(
            `DELETE
             FROM voter
             WHERE account_id = ?`,
            [accountId]);
    }

    async truncate() {
        await this.dbCon.execute(
            `truncate voter`);
    }

}

module.exports = VoterDAO;