const Lock = require('../lock/Lock');


class BaseDAO {
    constructor(snowflake) {
        this.lock = new Lock();
        this.snowflake = snowflake;
    }

    async _selectId(objValues) {
        throw new Error('Method must be overriden by subclass');
    }

    async _insert(objValues) {
        throw new Error('Method must be overriden by subclass');
    }

    async _update(objValues) { }

    async _getId(objValues) {
        let id = await this._selectId(objValues);
        if (id === null) {
            await this.lock.acquire();
            try {
                id = await this._selectId(objValues);
                if (id === null) {
                    await this._insert(objValues);
                    id = await this._selectId(objValues);
                }

            } finally {
                this.lock.release();
            }
        }
        await this._update({
            id,
            ...objValues
        });
        return id;
    }

}

module.exports = BaseDAO;