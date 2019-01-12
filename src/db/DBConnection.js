const mysql2 = require('mysql2/promise');
const Util = require('../util/Util');

class DBConnection {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async query(...args) {
        const [result] = await this.dbCon.query(...args);
        return result;
    }

    async execute(...args) {
        const [result] = await this.dbCon.execute(...args);
        return result;
    }

    async singleValue(...args) {
        const rows = await this.execute(...args);
        return rows.length ? Object.values(rows[0])[0] : null;
    }

    async end(...args) {
        return await this.dbCon.end(...args);
    }

    async insertBatch(statement, values, toArrayFn) {
        if (toArrayFn) {
            values = this._objsToArray(values, toArrayFn);
        }
        values = this._fixInsertArray(values);
        return await this.query(statement, [values]);
    }

    _objsToArray(objs, toArrayFn) {
        let toInsert = [];
        if (!Array.isArray(objs)) {
            objs = [objs];
        }
        for (let obj of objs) {
            toInsert.push(toArrayFn(obj));
        }
        return toInsert;
    }

    async keyValueMap(statement, key, value, params) {
        const rows = await this.query(statement, params);
        return Util.toKeyValue(rows, key, value);
    }

    _fixInsertArray(toInsert) {
        if (toInsert.length > 0 && !Array.isArray(toInsert[0])) {
            toInsert = [toInsert];
        }
        return toInsert;
    }
}



module.exports = {
    async createConnection(...args) {
        const dbCon = await mysql2.createConnection(...args);
        return new DBConnection(dbCon);
    }
};
