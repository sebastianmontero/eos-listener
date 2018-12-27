class AccountBalanceDAO {
    constructor(snowflake) {
        this.snowflake = snowflake;
        this.batch = [];
        this.batchSize = 50;
    }

    async insert({
        accountId,
        dayId,
        liquid,
        staked,
        refund,
    }) {
        await this._insert([
            accountId,
            dayId,
            liquid,
            staked,
            refund,

        ]);
    }

    async _insert(values) {

        await this.snowflake.execute(`INSERT INTO account_balance(
            account_id,
            day_id,
            liquid,
            staked,
            refund
        ) VALUES(?, ?, ?, ?, ?)`,
            values);
    }

    async insertBatch({
        accountId,
        dayId,
        liquid,
        staked,
        refund,
    }) {
        this.batch.push([
            accountId,
            dayId,
            liquid,
            staked,
            refund,

        ]);
        if (this.batchSize <= this.batch.length) {
            await this.flush();
        }
    }

    async flush() {
        if (this.batch.length > 0) {
            const temp = this.batch;
            this.batch = [];
            await this._insert(temp);
        }
    }

    async deleteByDayId(dayId) {
        await this.snowflake.execute(
            `DELETE FROM account_balance
             WHERE day_id = ?`,
            [dayId]);
    }

}

module.exports = AccountBalanceDAO;