const fetch = require('node-fetch');
const HttpStatus = require('http-status-codes');
const Snowflake = require('snowflake-promise').Snowflake;
const { AccountDao } = require('./dao');
const { AccountBalanceDao } = require('./dao');
const Lock = require('./lock/Lock');
const { Util, TimeUtil } = require('./util');
const { logger } = require('./Logger');

class AccountBalanceLoader {

    constructor(config) {
        this.config = config;
        const { httpEndpoints, db } = config;
        this.endpoints = {
            available: httpEndpoints.map(endpoint => endpoint + '/v1/chain/get_account'),
            inuse: []
        };
        this.streamMargin = 5;
        this.accountsFetched = 0;
        this.accountsStreamed = 0;
        this.lock = new Lock(httpEndpoints.length);
        this.snowflake = new Snowflake(db);
        this.accountDao = new AccountDao(this.snowflake);
        this.accountBalanceDao = new AccountBalanceDao(this.snowflake);
    }

    async start() {
        const date = new Date();
        this.dayId = TimeUtil.dayId(date);
        logger.debug('Loading account balances.... For date: ', date);
        await this.snowflake.connect();
        logger.debug('Deleting existing account balances for date: ', date);
        this.accountBalanceDao.deleteByDayId(this.dayId);
        this.statement = this.accountDao.selectStream();
        await this.statement.execute();
        this.numAccounts = this.statement.getNumRows();
        logger.debug('Num accounts: ', this.numAccounts);
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
        this.statement.streamRows({ start: start, end: end - 1 })
            .on('error', logger.error)
            .on('data', async account => {
                const accountDetails = await this._getAccountDetails(account.ACCOUNT_NAME);
                this.accountsFetched++;
                if (this._streamMore()) {
                    this._streamRows();
                }
                if (accountDetails) {
                    const { core_liquid_balance, voter_info, refund_request } = accountDetails;
                    const liquidObj = Util.parseAsset(core_liquid_balance)
                    const liquid = liquidObj ? liquidObj.amount : 0;
                    let staked = 0;
                    if (voter_info) {
                        staked = voter_info.staked / 1000;
                    }
                    let refund = 0;
                    if (refund_request) {
                        const { net_amount, cpu_amount } = refund_request;
                        let refundNetObj = Util.parseAsset(net_amount);
                        let refundCPUObj = Util.parseAsset(cpu_amount);
                        let refundNet = refundNetObj ? refundNetObj.amount : 0;
                        let refundCPU = refundCPUObj ? refundCPUObj.amount : 0;
                        refund = refundCPU + refundNet;
                    }
                    const toInsert = {
                        accountId: account.ACCOUNT_ID,
                        dayId: this.dayId,
                        liquid,
                        staked,
                        refund,
                    };
                    logger.debug('To insert: ', toInsert);
                    await this.accountBalanceDao.insertBatch(toInsert);
                }
                if (this.numAccounts <= this.accountsFetched) {
                    this.accountBalanceDao.flush();
                }

            })
            .on('end', () => { });
    }

    _streamMore() {
        return (this.accountsStreamed - this.accountsFetched) <= this.streamMargin;
    }

    async _getAccountDetails(accountName) {
        logger.debug('Getting account for: ', accountName);
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

            const { status } = response;
            if (status === HttpStatus.BAD_GATEWAY) {
                throw new Error('Bad gateway');
            }
            if (status === HttpStatus.SERVICE_UNAVAILABLE) {
                throw new Error('Service Unavailable');
            }
            if (status === HttpStatus.OK) {
                account = await response.json();
                //console.log('Fetched: ', accountName);
            } else {
                logger.error(`Invalid account name: ${accountName}, status: ${status}, endpoint: ${endpoint}`);
            }
            inuse.splice(inusePos, 1);
            available.push(endpoint);
            this.lock.release();

        } catch (error) {
            inuse.splice(inusePos, 1);
            logger.error(`Invalid endpoint:${endpoint}. Removing from available endpoints. Account name: ${accountName}`);
            account = await this._getAccountDetails(accountName);
        }
        return account;

    }
}

module.exports = AccountBalanceLoader;