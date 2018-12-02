const JSONFieldParser = require('./JSONFieldParser');

class Interpreter {

    constructor(keyDictionary, parser = new JSONFieldParser()) {
        this.parser = parser;
        this.keyDictionary = keyDictionary;
    }

    interpret(value) {
        const obj = this.parser.parse(value);
        return obj ? this._interpretObject(obj) : null;
    }

    _interpretObject(obj) {
        let readData = {};
        for (let property in this.keyDictionary) {
            const { colName, keys } = this.keyDictionary[property];
            readData[colName] = this._interpretKey(keys, obj);
        }
        return readData;
    }

    _interpretKey(keys, obj) {
        for (let key of keys) {
            if (key in obj) {
                return obj[key];
            }
        }
        return null;
    }
}

module.exports = Interpreter;