const fetch = require('node-fetch');
const HttpStatus = require('http-status-codes');
const FetchError = require('../error/FetchError');

class FetchService {

    static async json(endpoint, payload) {

        let props = {
            method: 'post',
            headers: { 'Content-Type': 'application/json' }
        };

        if (payload) {
            props.body = JSON.stringify(payload);
        }

        const response = await fetch(endpoint, props);

        const { status } = response;
        if (status === HttpStatus.OK) {
            return await response.json();
        } else if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
            const error = await response.json();
            throw new FetchError("Internal server error occured while fetching data", status, error);
        } else {
            throw new FetchError(`Server responded with status: ${status}`, status, response);
        }
    }
}

module.exports = FetchService;