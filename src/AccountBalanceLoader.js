const fetch = require('node-fetch');
const HttpStatus = require('http-status-codes');
const Snowflake = require('snowflake-promise').Snowflake;
const { AccountDao } = require('./dao');
const { AccountBalanceDao } = require('./dao');
const Lock = require('./lock/Lock');

class AccountBalanceLoader {

    constructor(config) {
        this.config = config;
        const { httpEndpoints, db } = config;
        this.endpoints = {
            available: httpEndpoints.map(endpoint => endpoint + '/v1/chain/get_account'),
            inuse: []
        };
        console.dir(this.endpoints);
        this.streamMargin = 5;
        this.accountsFetched = 0;
        this.accountsStreamed = 0;
        this.lock = new Lock(httpEndpoints.length);
        this.snowflake = new Snowflake(db);
        this.accountDao = new AccountDao(this.snowflake);
        this.accountBalanceDao = new AccountBalanceDao(this.snowflake);
    }

    /* async start() {
        console.log('Loading account balances...');
        await this.snowflake.connect();
        const accounts = await this.accountDao.select();
        for (let account of accounts) {
            const accountDetails = await this._getAccountDetails(account.ACCOUNT_NAME);
             this._getAccountDetails(account.ACCOUNT_NAME).then(accountDetails => {
                if (accountDetails) {
                    const { voter_info } = accountDetails;
                    if (voter_info && voter_info.producers.length > 0) {
                        console.log('Account: ', accountDetails);
                    } 
                }
            }); 
        }
    } */

    async start() {
        console.log('Loading account balances...');
        await this.snowflake.connect();
        this.statement = this.accountDao.selectStream();
        await this.statement.execute();
        this.numAccounts = this.statement.getNumRows();
        console.log('Num accounts: ', this.numAccounts);
        this._streamRows();

    }

    _streamRows() {
        if (this.numAccounts <= this.accountsStreamed) {
            return;
        }
        const start = this.accountsStreamed;
        let end = start + this.endpoints.available.length + this.streamMargin;
        end = Math.min(end, this.numAccounts);
        this.accountsStreamed = end;
        console.log(`Streaming from: ${start} to ${end}`);
        this.statement.streamRows({ start: start, end: end - 1 })
            .on('error', console.error)
            .on('data', async account => {
                //this._getAccountDetails(account.ACCOUNT_NAME);
                const accountDetails = await this._getAccountDetails(account.ACCOUNT_NAME);
                this.accountsFetched++;
                if (this._streamMore()) {
                    this._streamRows();
                }
                this.account
            })
            .on('end', () => console.log('All accounts have been streamed'));
    }

    _streamMore() {
        return (this.accountsStreamed - this.accountsFetched) <= this.streamMargin;
    }

    /*async _getAccountDetails(accountName) {
        try {
            console.log('Getting account for: ', accountName);
            return await this.rpc.get_account(accountName);
        } catch (error) {
            console.log(`Account: ${accountName} does not exist.`);
            console.error(error);
            return null;
        }

    }*/

    async _getAccountDetails(accountName) {
        //console.log('Getting account for: ', accountName);
        const payload = {
            account_name: accountName
        };
        const { available, inuse } = this.endpoints;
        const inusePos = inuse.length;
        if (available.length === 0 && inusePos === 0) {
            throw new Error('No http api endpoints available to query account details');
        }
        await this.lock.acquire();

        const endpoint = available.pop();
        inuse.push(endpoint);
        let account = null;
        try {
            const response = await fetch(endpoint, {
                method: 'post',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }

            });
            //console.log(response);

            const { status } = response;
            if (status === HttpStatus.BAD_GATEWAY) {
                throw new Error('Bad gateway');
            }
            if (status === HttpStatus.SERVICE_UNAVAILABLE) {
                throw new Error('Service Unavailable');
            }
            if (status === HttpStatus.OK) {
                account = await response.json();
                console.log('Fetched: ', accountName);
            } else {
                console.log(`Invalid account name: ${accountName}, status: ${status}, endpoint: ${endpoint}`);
            }
            inuse.splice(inusePos, 1);
            available.push(endpoint);
            this.lock.release();

        } catch (error) {
            inuse.splice(inusePos, 1);
            console.log(`Invalid endpoint:${endpoint}. Removing from available endpoints`);
            account = await this._getAccountDetails(accountName);
        }
        return account;

    }
}

module.exports = AccountBalanceLoader;