const BaseDao = require('./BaseDao');


class ChannelDAO extends BaseDao {
    constructor(dbCon) {
        super(dbCon);
    }

    async selectChannelId(channelName) {
        return await this._selectId({ channelName });
    }

    async _selectId({ channelName }) {
        const [rows] = await this.dbCon.execute('SELECT channel_id FROM channel WHERE channel_name = ?', [channelName.toUpperCase()]);
        return rows.length ? rows[0].CHANNEL_ID : null;
    }

    async _insert({ channelName }) {
        const [result] = await this.dbCon.execute(
            `INSERT INTO channel (channel_name)
             VALUES (?)`,
            [channelName.toUpperCase()]);
        return result;
    }

    async insert(channelName) {
        return await this._insert({ channelName });
    }

    async getChannelId(channelName) {
        return await this._getId({ channelName });
    }

}

module.exports = ChannelDAO;