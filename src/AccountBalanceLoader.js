const fetch = require('node-fetch');
const HttpStatus = require('http-status-codes');
const DBCon = require('./db/DBConnection');
const mysqlStream = require('mysql2');
const { AccountDao, AccountBalanceDao } = require('./dao');
const Lock = require('./lock/Lock');
const { Util, TimeUtil } = require('./util');
const { logger } = require('./Logger');

class AccountBalanceLoader {

    constructor(config) {
        this.config = config;
        const { httpEndpoints } = config;
        this.endpoints = {
            available: httpEndpoints.map(endpoint => endpoint + '/v1/chain/get_account'),
            inuse: []
        };
        this.buffer = 5;
        this.accountsStreamed = 0;
        this.accountsFetched = 0;
        this.isPaused = false;
        this.lock = new Lock(httpEndpoints.length);
    }

    async start() {
        const date = new Date();
        this.dayId = TimeUtil.dayId(date);
        logger.info('Loading account balances.... For date: ', date);
        this.dbCon = await DBCon.createConnection(this.config.db);
        this.dbConStream = mysqlStream.createConnection(this.config.db);
        this.dbConStream.on('error', function (err) {
            logger.error('Error2:', err);
            this._handleReconnect();
        });
        this.accountDao = new AccountDao(this.dbCon, this.dbConStream);
        this.accountBalanceDao = new AccountBalanceDao(this.dbCon);
        logger.info('Deleting existing account balances for date: ', date);
        this.accountBalanceDao.deleteByDayId(this.dayId);
        this._loadAccounts();

    }
    _getStreamMargin() {
        return this.endpoints.available.length + this.buffer;
    }
    _shouldPause() {
        if (!this.isPaused) {
            if ((this.accountsStreamed - this.accountsFetched) >= this._getStreamMargin()) {
                this.dbConStream.pause();
                this.isPaused = true;
            }
        }
    }
    _shouldContinue() {
        if (this.isPaused) {
            if ((this.accountsStreamed - this.accountsFetched) < this.buffer) {
                this.isPaused = false;
                this.dbConStream.resume();
            }
        }
    }
    _loadAccounts(offset = 0) {
        const query = this.accountDao.selectStream(offset);
        query
            .on('result', async account => {
                this.accountsStreamed++;
                this._shouldPause();
                const accountDetails = await this._getAccountDetails(account.account_name);
                this.accountsFetched++;
                if (this.accountsFetched % 100 == 0) {
                    logger.info(`Streamed: ${this.accountsStreamed} Fetched: ${this.accountsFetched}`);
                }
                this._shouldContinue();
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
                        accountId: account.account_id,
                        dayId: this.dayId,
                        liquid,
                        staked,
                        refund,
                    };
                    logger.debug('To insert: ', toInsert);
                    await this.accountBalanceDao.batchInsert(toInsert);
                }
            })
            .on('end', async () => {
                logger.info('All rows have been processed. Flushing and closing connections...');
                this.dbConStream.end();
                await this.accountBalanceDao.flush();
                await this.dbCon.end();
                logger.info('Connections closed.');
            })
            .on('error', async err => {
                logger.error('Error1:', err);
                this._handleReconnect();
            });

    }

    _handleReconnect() {
        logger.info('Reconnecting...');
        this.isPaused = false;
        this.dbConStream = mysqlStream.createConnection(this.config.db);
        logger.info('Created new connection. Loading remaining accounts...');
        this._loadAccounts(this.accountsStreamed);
    }


    async _getAccountDetails(accountName) {
        logger.debug('Getting account for: ', accountName);
        const payload = {
            account_name: accountName.toLowerCase()
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

            if (status === HttpStatus.OK) {
                account = await response.json();
                //console.log('Fetched: ', accountName);
            } else if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
                const error = await response.json();
                //console.log(`account: ${accountName} url: ${endpoint}`);
                logger.error(`Invalid account name: ${accountName}, status: ${status}, endpoint: ${endpoint}`);
                logger.error(error.error.details[0].message);
            } else {
                throw new Error(`Server responded with status: ${status}`);
            }
            inuse.splice(inusePos, 1);
            available.push(endpoint);
            this.lock.release();

        } catch (error) {
            inuse.splice(inusePos, 1);
            logger.error(`Invalid endpoint:${endpoint}. Removing from available endpoints. Account name: ${accountName}`);
            logger.error(`Endpoints remaining: ${inuse.length + available.length}`);
            account = await this._getAccountDetails(accountName);
        }
        return account;

    }
}

module.exports = AccountBalanceLoader;