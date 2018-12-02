const Util = require('./Util');

class JSONFieldParser {

    parse(value) {
        let valueJson = value.substring(value.indexOf('{'), value.lastIndexOf('}') + 1);
        valueJson = valueJson.replace(/'/g, '"');
        let jsonObj = null;
        if (valueJson) {
            jsonObj = JSON.parse(valueJson);
        } else {
            jsonObj = this._parseInvalidJson(value);
        }

        return Util.isEmptyObj(jsonObj) ? null : jsonObj;
    }

    _parseInvalidJson(str) {
        let pos = -1;
        let obj = {};
        while ((pos = str.indexOf(':', pos + 1)) != -1) {
            this._parseKeyValue(str, pos, obj);
            pos++;
        }
        return obj;
    }

    _parseKeyValue(str, assignCharPos, obj) {
        let pos = Util.lastIndexOf(str, [' '], assignCharPos - 1, true);
        let key = '', value = '';
        if (pos >= 0) {
            let searchChars = null;
            let endPos = pos;
            let char = str.charAt(pos);
            if (['"', "'"].indexOf(char) != -1) {
                searchChars = [char];
            } else {
                searchChars = [' ', ',', ':'];
                endPos++;
            }
            let startPos = Util.lastIndexOf(str, searchChars, endPos - 1) + 1;
            key = str.substring(startPos, endPos);
        }
        if (!key) {
            return false;
        }

        pos = Util.indexOf(str, [' '], assignCharPos + 1, true);
        if (pos >= 0) {
            let searchChars = null;
            let startPos = pos;
            let char = str.charAt(pos);
            if (['"', "'"].indexOf(char) != -1) {
                searchChars = [char];
                startPos++;
            } else {
                searchChars = [' ', ',', ':'];
            }
            let endPos = Util.indexOf(str, searchChars, startPos);
            if (endPos == -1) {
                endPos = str.length;
            }
            value = str.substring(startPos, endPos);
        }
        obj[key] = value;
        return true;
    }

}

module.exports = JSONFieldParser;