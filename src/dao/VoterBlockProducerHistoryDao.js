const { TimeUtil } = require('../util');
const { logger } = require('../Logger');
const {
    SpecialValues: {
        NON_VOTING_PROXY: { id: NON_VOTING_PROXY }
    }
} = require('../const');

class VoterBlockProducerHistoryDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async takeSnapshot(date) {
        date = date || new Date();
        const dayId = TimeUtil.dayId(date);
        logger.info(`Taking voter block producer snapshot. Deleting current data for date: ${date} dayId: ${dayId}...`);
        await this.deleteByDayId(dayId);
        logger.info(`Deleted current voter block producer data. Taking snapshot for date: ${date} dayId: ${dayId}...`);
        await this.storeSnapshot(dayId);
        logger.info(`Voter block producer snapshot created for date: ${date} dayId: ${dayId}...`);
        return dayId;
    }

    async storeSnapshot(dayId) {
        await this.dbCon.execute(
            `INSERT INTO voter_block_producer_history(
                voter_id,
                block_producer_id,
                proxy_id,
                day_id,
                votes
            )
            SELECT vh1.voter_id,
            IF(vh2.block_producer_id IS NOT NULL, vh2.block_producer_id, IF(vh1.block_producer_id < 0, ?,vh1.block_producer_id)) block_producer_id,
                   vh1.proxy_id,
                   ?,
                   vh1.votes
            FROM voter_block_producer vh1 LEFT JOIN
	             voter_block_producer vh2 on vh1.proxy_id = vh2.voter_id and
								             vh1.block_producer_id < 0
            `,
            [NON_VOTING_PROXY, dayId]
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