const BaseBatchDao = require('./BaseBatchDao');

class BetDAO extends BaseBatchDao {
    constructor(dbCon) {
        super('gameBetId', 20);
        this.dbCon = dbCon;
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

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
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
            ) VALUES ?`,
            values,
            toArray);
    }

    async insert(values) {
        await this._insert(values);
    }

    async insertObj(objs) {
        await this._insert(objs, this._toInsertArray);
    }

    async _update({
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
            winTokenIdStr = 'win_token_id = ?,';
            params.unshift(winTokenId);
        }
        await this.dbCon.execute(
            `UPDATE bet 
             SET ${winTokenIdStr}
                 win_amount = ?,
                 bet_status_id = ?,
                 completed_day_id = ?,
                 completed_hour_of_day = ?,
                 completed_time = ?
             WHERE dapp_table_id = ? AND
                   game_bet_id = ?`,
            params
        );
    }

    async _remove({
        dappTableId,
        gameBetId,
    }) {
        await this.dbCon.execute(
            `DELETE 
            FROM bet
            WHERE dapp_table_id = ? AND
                  game_bet_id = ?`,
            [dappTableId, gameBetId]
        );
    }


    async selectId({
        dappTableId,
        gameBetId,
    }) {
        const row = await this.dbCon.execute(
            `SELECT bet_id
            FROM bet
            WHERE dapp_table_id = ? AND
                  game_bet_id = ?`,
            [dappTableId, gameBetId]
        );
        return row.length ? row[0].bet_id : null;
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