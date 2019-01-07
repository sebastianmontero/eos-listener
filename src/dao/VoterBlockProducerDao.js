
class VoterBlockProducerDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert(values) {
        if (values.length > 0) {
            await this.dbCon.query(
                `INSERT INTO voter_block_producer(
                    voter_id,
                    block_producer_id,
                    votes
                ) VALUES ?`,
                [values]);
        }
    }

    async deleteByVoterId(voterId) {
        await this.dbCon.execute(
            `DELETE FROM voter_block_producer
             WHERE voter_id = ?`,
            [voterId]);
    }

    async revote(voterId, voterProducers) {
        await this.deleteByVoterId(voterId);
        console.log(voterProducers);
        await this.insert(voterProducers);
    }

    async updateVotes(voterId, votes) {
        await this.dbCon.execute(
            `UPDATE voter_block_producer
             SET votes = ?
             WHERE voter_id = ?`,
            [votes, voterId]
        );
    }

    async truncate() {
        await this.dbCon.execute(
            `truncate voter_block_producer`);
    }

}

module.exports = VoterBlockProducerDAO;