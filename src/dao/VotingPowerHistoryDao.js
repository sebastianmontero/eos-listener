const { logger } = require('../Logger');

class VotingPowerHistoryDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async updateDay(dayId) {
        logger.info(`Updating voting power history for dayId: ${dayId}. Deleting current data for dayId: ${dayId}...`);
        await this.deleteByDayId(dayId);
        logger.info(`Deleted voting power history for dayId: ${dayId}. Inserting data for dayId: ${dayId}...`);
        await this.insertDay(dayId);
        logger.info(`Voting power history updated for dayId: ${dayId}...`);
    }

    async insertDay(dayId) {
        await this.dbCon.execute(
            `INSERT INTO voting_power_history(
                day_id,
                proxy_id,
                votes,
                voter_count
            )
            SELECT day_id,
                   proxy_id,
                   SUM(votes),
                   COUNT(DISTINCT voter_id)
            FROM (
                SELECT day_id,
                       voter_id,
                       proxy_id,
                       MAX(votes) votes
                FROM voter_block_producer_history
                WHERE day_id = ?
                GROUP BY day_id,
                         voter_id,
                         proxy_id
            ) v
            GROUP BY day_id,
                     proxy_id
            `,
            [dayId]
        );
    }

    async deleteByDayId(dayId) {
        await this.dbCon.execute(
            `DELETE FROM voting_power_history
             WHERE day_id = ?`,
            [dayId]
        );
    }

}

module.exports = VotingPowerHistoryDAO;