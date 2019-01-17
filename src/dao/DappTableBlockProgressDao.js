

class DappTableBlockProgressDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert(values) {

        await this.dbCon.insertBatch(
            `INSERT INTO dapp_table_block_progress(
                dapp_table_id,
                block_progress
            ) VALUES ?
            ON DUPLICATE KEY UPDATE block_progress = VALUES(block_progress)`,
            values);
    }

}

module.exports = DappTableBlockProgressDAO;