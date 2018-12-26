class AccountBalanceDAO {
    constructor(snowflake) {
        this.snowflake = snowflake;
    }

    async insert({
        accountId,
        dayId,
        liquid,
        staked,
        refund,
    }) {

        await this.snowflake.execute(`INSERT INTO account_balance(
            account_id,
            day_id,
            liquid,
            staked,
            refund
        ) VALUES(?, ?, ?, ?, ?)`,
            [
                accountId,
                dayId,
                liquid,
                staked,
                refund,

            ]);
    }

}

module.exports = AccountBalanceDAO;