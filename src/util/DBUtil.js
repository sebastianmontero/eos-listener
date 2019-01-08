


class DBUtil {
    fixInsertArray(toInsert) {
        if (toInsert.length > 0 && !Array.isArray(toInsert[0])) {
            toInsert = [toInsert];
        }
        return toInsert;
    }
}

module.exports = DBUtil;