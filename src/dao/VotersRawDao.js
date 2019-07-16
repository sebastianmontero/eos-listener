
class VotersRawDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert(values) {
        if (values.length > 0) {
            await this.dbCon.insertBatch(
                `INSERT INTO voters_raw(
                    voter,
                    proxy,
                    producers,
                    staked,
                    is_proxy
                ) VALUES ?`,
                values);
        }
    }

    async truncate() {
        await this.dbCon.execute(
            `truncate voters_raw`);
    }

}

module.exports = VotersRawDAO;