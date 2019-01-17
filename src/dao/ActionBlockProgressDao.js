

class ActionBlockProgressDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert(values) {

        await this.dbCon.insertBatch(
            `INSERT INTO action_block_progress(
                action_id,
                block_progress
            ) VALUES ?
            ON DUPLICATE KEY UPDATE block_progress = VALUES(block_progress)`,
            values);
    }

}

module.exports = ActionBlockProgressDAO;