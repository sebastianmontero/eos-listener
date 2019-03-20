
class VoterBlockProducerHistoryDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
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