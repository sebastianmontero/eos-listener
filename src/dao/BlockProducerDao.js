const BaseBatchDao = require('./BaseBatchDao');

class BlockProducerDAO extends BaseBatchDao {
    constructor(snowflake) {
        super('accountId', 20);
        this.snowflake = snowflake;
    }

    _toInsertArray({
        accountId,
        isActive,
        url,
        totalVotes,
        location,
    }) {
        return [
            accountId,
            isActive,
            url,
            totalVotes,
            location,
        ];
    }

    async insert(obj) {
        await this._insert(this._toInsertArray(obj));
    }

    async _insert(values) {

        await this.snowflake.execute(
            `INSERT INTO block_producer(
                account_id,
                is_active,
                url,
                total_votes,
                location
            ) VALUES(?, ?, ?, ?, ?)`,
            values);
    }


    async _update({
        accountId,
        isActive,
        url,
        totalVotes,
        location,
    }) {
        await this.snowflake.execute(
            `UPDATE block_producer
             SET is_active = :1,
                 url = :2,
                 total_votes = :3,
                 location = :4
             WHERE account_id = :5`,
            [
                isActive,
                url,
                totalVotes,
                location,
                accountId,
            ]
        );
    }

    async _remove({
        accountId
    }) {
        await this.snowflake.execute(
            `DELETE 
            FROM block_producer
            WHERE account_id = :1`,
            [accountId]
        );
    }

}

module.exports = BlockProducerDAO;