const BaseDao = require('./BaseDao');


class ChannelDAO extends BaseDao {
    constructor(snowflake) {
        super(snowflake);
    }

    async selectChannelId(channelName) {
        return await this._selectId({ channelName });
    }

    async _selectId({ channelName }) {
        const rows = await this.snowflake.execute('SELECT channel_id FROM channel WHERE channel_name = :1', [channelName.toUpperCase()]);
        return rows.length ? rows[0].CHANNEL_ID : null;
    }

    async _insert({ channelName }) {
        await this.snowflake.execute(
            `INSERT INTO channel (channel_name)
             VALUES (?)`,
            [channelName.toUpperCase()]);
    }

    async insert(channelName) {
        await this._insert({ channelName });
    }

    async getChannelId(channelName) {
        return await this._getId({ channelName });
    }

}

module.exports = ChannelDAO;