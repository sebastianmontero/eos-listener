
class Util {
    static isEmptyObj(obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key))
                return false;
        }
        return true;
    }

    static _wasFound(str, chars, pos, not = false) {
        let foundChar = chars.indexOf(str.charAt(pos)) > -1;
        return ((foundChar && !not) || (!foundChar && not));
    }

    static indexOf(str, chars, pos, not = false) {
        for (let i = pos; i < str.length; i++) {
            if (this._wasFound(str, chars, i, not)) {
                return i;
            }
        }
        return -1;
    }

    static lastIndexOf(str, chars, pos, not = false) {
        for (let i = pos; i >= 0; i--) {
            if (this._wasFound(str, chars, i, not)) {
                return i;
            }
        }
        return -1;
    }
}

module.exports = Util;