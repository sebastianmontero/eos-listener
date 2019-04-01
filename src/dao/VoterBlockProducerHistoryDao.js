const { TimeUtil } = require('../util');
const { logger } = require('../Logger');

class VoterBlockProducerHistoryDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async takeSnapshot(date) {
        date = date || new Date();
        const dayId = TimeUtil.dayId(date);
        logger.info(`Taking voter block producer snapshot. Deleting current data for date: ${date}...`);
        await this.deleteByDayId(dayId);
        logger.info(`Deleted current voter block producer data. Taking snapshot for date: ${date}...`);
        await this.storeSnapshot(dayId);
        logger.info(`Voter block producer snapshot created for date: ${date}...`);
    }

    async storeSnapshot(dayId) {
        await this.dbCon.execute(
            `INSERT INTO voter_block_producer_history(
                voter_id,
                block_producer_id,
                proxy_id,
                day_id,
                votes,
                proxied_votes
            )
             SELECT voter_id,
                    block_producer_id,
                    proxy_id,
                    ?,
                    votes,
                    proxied_votes
            FROM voter_block_producer`,
            [dayId]
        );
    }

    async deleteByDayId(dayId) {
        await this.dbCon.execute(
            `DELETE FROM voter_block_producer_history
             WHERE day_id = ?`,
            [dayId]
        );
    }

}

module.exports = VoterBlockProducerHistoryDAO;