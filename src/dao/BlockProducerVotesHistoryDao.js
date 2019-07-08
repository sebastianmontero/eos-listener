const { logger } = require('../Logger');

class BlockProducerVotesHistoryDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async updateDay(dayId) {
        logger.info(`Updating block producer votes history for dayId: ${dayId}. Deleting current data for dayId: ${dayId}...`);
        await this.deleteByDayId(dayId);
        logger.info(`Deleted block producer votes history for dayId: ${dayId}. Inserting data for dayId: ${dayId}...`);
        await this.insertDay(dayId);
        logger.info(`Block producer votes history updated for dayId: ${dayId}...`);
    }

    async insertDay(dayId) {
        await this.dbCon.execute(
            `INSERT INTO block_producer_votes_history(
                day_id,
                block_producer_id,
                proxy_id,
                votes,
                voter_count
            )
            SELECT day_id,
                   block_producer_id,
                   proxy_id,
                   SUM(votes),
                   COUNT(DISTINCT voter_id)
            FROM voter_block_producer_history
            WHERE day_id = ?
            GROUP BY day_id,
                     block_producer_id,
                     proxy_id
            `,
            [dayId]
        );
    }

    async deleteByDayId(dayId) {
        await this.dbCon.execute(
            `DELETE FROM block_producer_votes_history
             WHERE day_id = ?`,
            [dayId]
        );
    }

}

module.exports = BlockProducerVotesHistoryDAO;