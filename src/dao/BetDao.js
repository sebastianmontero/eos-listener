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
        placedTime,
        completedDayId,
        completedHourOfDay,
        completedTime,

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
                placed_time,
                completed_day_id,
                completed_hour_of_day,
                completed_time
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
                placedTime,
                completedDayId,
                completedHourOfDay,
                completedTime
            ]
        );
    }


    async update({
        dappTableId,
        gameBetId,
        winAmount,
        winTokenId,
        betStatusId,
        completedDayId,
        completedHourOfDay,
        completedTime,
    }) {

        await this.snowflake.execute(
            `UPDATE bet 
             SET win_amount = :1,
                 win_token_id = :2,
                 bet_status_id = :3,
                 completed_day_id = :4,
                 completed_hour_of_day = :5,
                 completed_time = :6
             WHERE dapp_table_id = :7 AND
                   game_bet_id = :8`,
            [
                winAmount,
                winTokenId,
                betStatusId,
                completedDayId,
                completedHourOfDay,
                completedTime,
                dappTableId,
                gameBetId,
            ]
        );
    }

    async remove({
        dappTableId,
        gameBetId,
    }) {
        const row = await this.snowflake.execute(
            `DELETE 
            FROM bet
            WHERE dapp_table_id = :1 AND
                  game_bet_id = :2`,
            [dappTableId, gameBetId]
        );
        return row.length ? row.BET_ID : null;
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