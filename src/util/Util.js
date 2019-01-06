
const parseAssetRegex = /^\s*(\d+.?\d*)\s*([a-zA-Z]+)\s*$/;

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

    static parseAsset(value) {
        const result = parseAssetRegex.exec(value);
        if (result) {
            return {
                amount: Number(result[1]),
                symbol: result[2],
            };
        }
        return null;
    }

    static modifiedProps(oldObj, newObj, props) {
        const mod = {};
        props = props || Object.keys(oldObj);
        for (let prop of props) {
            if (oldObj[prop] != newObj[prop]) {
                mod[prop] = true;
            }
        }
        return Util.isEmptyObj(mod) ? null : mod;
    }

    static toKeyValue(objs, key, value) {
        let keyValue = {};
        for (let obj of objs) {
            keyValue[obj[key]] = obj[value];
        }
        return keyValue;
    }
}

module.exports = Util;