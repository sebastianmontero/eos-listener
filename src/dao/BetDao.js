const Lock = require('../lock/Lock');


class BetDAO {
    constructor(snowflake) {
        this.lock = new Lock();
        this.snowflake = snowflake;
    }

    async insert({
        dappTableId,
        gameBetId,
        userAccountId,
        betAmount,
        betTokenId,
        winAmount,
        winTokenId,
        betStatusId,
        placedDayId,
        placedHourOfDay,
        placedBetTime,
        completedDayId,
        completedHourOfDay,
        completedBetTime,

    }) {

        await this.snowflake.execute(
            `INSERT INTO bet (
                dapp_table_id,
                game_bet_id,
                user_account_id,
                bet_amount,
                bet_token_id,
                win_amount,
                win_token_id,
                bet_status_id,
                placed_day_id,
                placed_hour_of_day,
                placed_bet_time,
                completed_day_id,
                completed_hour_of_day,
                completed_bet_time,
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                dappTableId,
                gameBetId,
                userAccountId,
                betAmount,
                betTokenId,
                winAmount,
                winTokenId,
                betStatusId,
                placedDayId,
                placedHourOfDay,
                placedBetTime,
                completedDayId,
                completedHourOfDay,
                completedBetTime
            ]
        );
    }


    async update({
        dappTableId,
        gameBetId,
        winAmount,
        betStatusId,
        completedDayId,
        completedHourOfDay,
        completedBetTime,
    }) {

        await this.snowflake.execute(
            `UPDATE bet 
             SET win_amount = :1,
                 bet_status_id = :2,
                 completed_day_id = :3,
                 completed_hour_of_day = :4,
                 completed_bet_time = :5
             WHERE dapp_table_id = :6 AND
                   game_bet_id = :7`,
            [
                winAmount,
                betStatusId,
                completedDayId,
                completedHourOfDay,
                completedBetTime,
                dappTableId,
                gameBetId,
            ]
        );
    }

    async selectId({
        dappTableId,
        gameBetId,
    }) {
        const row = await this.snowflake.execute(
            `SELECT bet_id
            FROM bet
            WHERE dapp_table_id = :1 AND
                  game_bet_id = :2`,
            [dappTableId, gameBetId]
        );
        return row.length ? row.BET_ID : null;
    }

    async exists({
        dappTableId,
        gameBetId,
    }) {
        return !! await this.selectId({
            dappTableId,
            gameBetId
        });
    }
}


module.exports = BetDAO;