const fetch = require('node-fetch');
const Snowflake = require('snowflake-promise').Snowflake;
const { AccountDao } = require('./dao');
const { AccountBalanceDao } = require('./dao');
const Lock = require('./lock/Lock');

class AccountBalanceLoader {

    constructor(config) {
        this.config = config;
        const { eosjsEndpoints, db } = config;
        this.endpoints = {
            available: eosjsEndpoints.slice(),
            inuse: []
        };
        this.lock = new Lock();
        this.snowflake = new Snowflake(db);
        this.accountDao = new AccountDao(this.snowflake);
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
        const statement = this.accountDao.selectStream();
        await statement.execute();
        this.start = 0;
        this.end = 0;
        statement.streamRows({ start: this.start, end: this.end })
            .on('error', console.error)
            .on('data', account => {
                //this._getAccountDetails(account.ACCOUNT_NAME);
                this._getAccountDetails('eosdactoken');
            })
            .on('end', () => console.log('All accounts have been streamed'));

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
        try {
            console.log('Getting account for: ', accountName);
            const payload = {
                account_name: accountName
            };
            const { available, inuse } = this.endpoints;
            if (available.length === 0) {
                if (inuse.length === 0) {
                    throw new Error('No http api endpoints available to query account details');
                }
                await this.lock.acquire();
            }

            const res = await fetch('https://api.eosnewyork.io/v1/chain/get_account', {
                method: 'post',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }

            });
            console.log(res);
            console.log('Status: ', res.status);
            const json = await res.json();
            console.log(json);
            console.log(json.error.details);

            return null;
        } catch (error) {
            console.log(`Account: ${accountName} does not exist.`);
            console.error(error);
            return null;
        }

    }
}

module.exports = AccountBalanceLoader;