const BaseBatchDao = require('./BaseBatchDao');
const { Util } = require('../util');

class BlockProducerDAO extends BaseBatchDao {
    constructor(dbCon) {
        super('accountName', 600);
        this.dbCon = dbCon;
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

        await this.dbCon.query(
            `INSERT INTO block_producer(
                account_id,
                is_active,
                url,
                total_votes,
                location
            ) VALUES ?`,
            [values]);
    }


    async _update({
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

    async _selectAccountIdAndName() {
        const [rows] = await this.dbCon.execute(
            `SELECT a.account_id, 
                    a.account_name
             FROM block_producer bp inner join 
                  account a on bp.account_id = a.account_id`);
        return rows;
    }

    async mapAccountIdToName() {
        const accounts = await this._selectAccountIdAndName();
        return Util.toKeyValue(accounts, 'account_name', 'account_id');
    }

    async _remove({
        accountId
    }) {
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