const HttpStatus = require('http-status-codes');
const fetch = require('node-fetch');
const DBCon = require('./db/DBConnection');
const { BlockProducerDao } = require('./dao');

class BPEndpointListGenerator {

    constructor(config) {
        this.config = config;
    }

    async start() {
        this.dbCon = await DBCon.createConnection(this.config.db);
        this.blockProducerDao = new BlockProducerDao(this.dbCon);
        const urls = await this.blockProducerDao.selectUniqueUrls();
        console.log('Loaded block producers with url. Getting API Endpoints...');
        let endpoints = new Set();
        for (let bpUrl of urls) {
            let url;
            try {
                url = new URL('bp.json', bpUrl.url);
                console.log(`Fetching url: ${url.href} ...`);
                let response = await fetch(url);

                const { status } = response;
                if (status === HttpStatus.OK) {
                    response = await response.json();
                    const { nodes } = response;
                    for (let node of nodes) {
                        if (node.api_endpoint) {
                            endpoints.add(node.api_endpoint);
                        }
                    }
                } else {
                    throw new Error(`Server responded with status: ${status}`);
                }

            } catch (error) {
                console.log(`Unable to get bp.json for url: ${url} because: ${error.message}`);
            }
        }
        console.log(`Number of endpoints found: ${endpoints.size}`);
        console.log(JSON.stringify([...endpoints]));
        this.dbCon.end();
    }
}

module.exports = BPEndpointListGenerator;