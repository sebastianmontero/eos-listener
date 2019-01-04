
class VoterDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert(values) {
        await this.dbCon.query(
            `INSERT IGNORE INTO voter(
                account_id,
                is_proxy
            ) VALUES ?`,
            [values]);
    }

    async truncate() {
        await this.dbCon.execute(
            `truncate voter`);
    }

}

module.exports = VoterDAO;