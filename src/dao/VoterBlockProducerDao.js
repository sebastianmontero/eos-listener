
class VoterBlockProducerDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async insert(values) {
        await this.dbCon.query(
            `INSERT INTO voter_block_producer(
                voter_id,
                block_producer_id,
                votes
            ) VALUES ?`,
            [values]);
    }

    async insertVoterVotes(voterId, votes, blockProducerIds) {
        let toInsert = [];

        for (let blockProducerId of blockProducerIds) {
            toInsert.push([
                voterId,
                blockProducerId,
                votes
            ]);
        }
        await this.insert(toInsert);
    }

    async deleteByVoterId(voterId) {
        await this.dbCon.execute(
            `DELETE FROM voter_block_producer
             WHERE voter_id = ?`,
            [voterId]);
    }

    async revote(voterId, votes, blockProducerIds) {
        await this.deleteByVoterId(voterId);
        await this.insertVoterVotes(voterId, votes, blockProducerIds);
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