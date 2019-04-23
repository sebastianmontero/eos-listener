const DBOps = require('./DBOps')

module.exports = {
    INSERT: 1,
    UPDATE: 2,
    DELETE: 3,
    getTableOp: function (dbOp) {
        if (DBOps.isInsert(dbOp)) {
            return this.INSERT;
        } else if (DBOps.isUpdate(dbOp)) {
            return this.UPDATE;
        } else {
            return this.DELETE;
        }
    }
};