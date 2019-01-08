class BlockProducerDAO {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO block_producer(
                account_id,
                is_active,
                url,
                total_votes,
                location
            ) VALUES ?`,
            values,
            toArray);
    }

    async insert(values) {
        await this._insert(values);
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


    async insertObj(objs) {
        await this._insert(objs, this._toInsertArray);
    }


    async update({
        accountId,
        isActive,
        url,
        totalVotes,
        location,
    }) {
        await this.dbCon.execute(
            `UPDATE block_producer
             SET is_active = ?,
                 url = ?,
                 total_votes = ?,
                 location = ?
             WHERE account_id = ?`,
            [
                isActive,
                url,
                totalVotes,
                location,
                accountId,
            ]
        );
    }

    async mapAccountNameToId() {
        return await this.dbCon.keyValueMap(
            `SELECT a.account_id, 
                    a.account_name
             FROM block_producer bp inner join 
                  account a on bp.account_id = a.account_id`,
            'account_name',
            'account_id');
    }

    async delete(accountId) {
        await this.dbCon.execute(
            `DELETE 
            FROM block_producer
            WHERE account_id = ?`,
            [accountId]
        );
    }

    async truncate() {
        await this.dbCon.execute(
            `truncate block_producer`
        );
    }

    async showParameters() {
        return await this.dbCon.execute(
            `show parameters`
        );
    }

}

module.exports = BlockProducerDAO;