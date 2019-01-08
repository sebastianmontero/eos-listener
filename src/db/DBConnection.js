const mysql2 = require('mysql2/promise');

class DBConnection {
    constructor(dbCon) {
        this.dbCon = dbCon;
    }

    async query(...args) {
        return await this.dbCon.query(...args);
    }

    async execute(...args) {
        return await this.dbCon.execute(...args);
    }

    async end(...args) {
        return await this.dbCon.end(...args);
    }

    async insertBatch(statement, values) {
        values = this._fixInsertArray(values);
        return await this.dbCon.query(statement, values);
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
