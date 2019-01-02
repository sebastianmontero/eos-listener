
class BaseDAO {
    constructor(dbCon, idColumn) {
        this.dbCon = dbCon;
        this.idColumn = idColumn;
    }

    async _selectByNaturalPK(objValues) {
        throw new Error('Method must be overriden by subclass');
    }

    async _insert(objValues) {
        throw new Error('Method must id be overriden by subclass');
    }

    async _update(oldValues, newValues) { }

    async _getId(objValues) {
        try {
            let result = await this._insert(objValues);
            console.log(result);
            return result.insertId;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                console.log('duplicate entry');
                let obj = await this._selectByNaturalPK(objValues);
                await this._update(obj, objValues);
                return obj[this.idColumn];
            } else {
                console.log(error);
                throw error;
            }
        }
    }

}

module.exports = BaseDAO;