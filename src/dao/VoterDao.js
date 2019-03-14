
class VoterDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert(values) {
        await this.dbCon.insertBatch(
            `INSERT IGNORE INTO voter(
                account_id,
                voter_type_id
            ) VALUES ? ON DUPLICATE KEY UPDATE voter_type_id = IF(voter_type_id = 2, voter_type_id, VALUES(voter_type_id))`,
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