const Lock = require('../lock/Lock');



class BetDAO {
    constructor(snowflake) {
        this.lock = new Lock();
        this.snowflake = snowflake;
    }

    _toInsertArray({
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
        return [
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
        ];
    }

    async _insert(values) {

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
            values
        );
    }

    async insert(bets) {

        if (!Array.isArray(bets)) {
            bets = [bets];
        }

        let values = [];
        for (let bet of bets) {
            values.push(this._toInsertArray(bet));
        }

        await this._insert(values);
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

        let winTokenIdStr = '';
        let params = [
            winAmount,
            betStatusId,
            completedDayId,
            completedHourOfDay,
            completedTime,
            dappTableId,
            gameBetId,
        ];

        if (winTokenId !== undefined) {
            winTokenIdStr = 'win_token_id = :8,';
            params.push(winTokenId);
        }
        await this.snowflake.execute(
            `UPDATE bet 
             SET win_amount = :1,
                 ${winTokenIdStr}
                 bet_status_id = :2,
                 completed_day_id = :3,
                 completed_hour_of_day = :4,
                 completed_time = :5
             WHERE dapp_table_id = :6 AND
                   game_bet_id = :7`,
            params
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