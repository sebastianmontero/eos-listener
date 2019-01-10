class BlockProducerHistoryDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async storeSnapshot(dayId) {
        await this.dbCon.execute(
            `INSERT INTO block_producer_history(
                account_id,
                day_id,
                is_active,
                url,
                total_votes,
                location
            )
             SELECT account_id,
                    ?,
                    is_active,
                    url,
                    total_votes,
                    location
            FROM block_producer`,
            [dayId]
        );
    }

    async deleteByDayId(dayId) {
        await this.dbCon.execute(
            `DELETE FROM block_producer_history
             WHERE day_id = ?`,
            [dayId]
        );
    }

}

module.exports = BlockProducerHistoryDAO;