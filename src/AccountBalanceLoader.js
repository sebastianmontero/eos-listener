const { JsonRpc } = require('eosjs');
const fetch = require('node-fetch');
const Snowflake = require('snowflake-promise').Snowflake;
const { AccountDao } = require('./dao');

class AccountBalanceLoader {

    constructor(config) {
        this.config = config;
        const { eosjsEndpoint, db } = config;
        this.snowflake = new Snowflake(db);
        this.accountDao = new AccountDao(this.snowflake);
        this.rpc = new JsonRpc(eosjsEndpoint, { fetch });
    }

    async start() {
        console.log('Loading account balances...');
        await this.snowflake.connect();
        const accounts = await this.accountDao.select();
        for (let account of accounts) {
            const accountDetails = await this._getAccountDetails(account.ACCOUNT_NAME);
            if (accountDetails) {
                const { voter_info } = accountDetails;
                if (voter_info && voter_info.producers.length > 0) {
                    console.log('Account: ', accountDetails);
                }
            }
        }
    }

    async _getAccountDetails(accountName) {
        try {
            console.log('Getting account for: ', accountName);
            return await this.rpc.get_account(accountName);
        } catch (error) {
            console.log(`Account: ${accountName} does not exist.`);
            console.error(error);
            return null;
        }

    }
}

module.exports = AccountBalanceLoader;