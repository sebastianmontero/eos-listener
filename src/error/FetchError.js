const DomainError = require('./DomainError');

class FetchError extends DomainError {

    constructor(message, httpCode, error) {
        super(message);
        this.httpCode = httpCode;
        this.error = error;
    }

    toString() {
        return super.toString() + `\nHTTP Code: ${this.httpCode} \n Error: ${this.error}`;
    }
}

module.exports = FetchError;