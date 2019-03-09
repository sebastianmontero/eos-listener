const fetch = require('node-fetch');
const HttpStatus = require('http-status-codes');
const DBCon = require('./db/DBConnection');
const mysqlStream = require('mysql2');
const { AccountDao, AccountBalanceDao } = require('./dao');
const Lock = require('./lock/Lock');
const { Util, TimeUtil } = require('./util');
const { logger } = require('./Logger');
const { General } = require('./const');

class AccountBalanceLoader {

    constructor(config) {
        this.config = config;
        let { httpEndpoints } = config;
        httpEndpoints = [...new Set(httpEndpoints)];
        this.endpoints = {
            available: httpEndpoints.map(endpoint => endpoint + '/v1/chain/get_account'),
            inuse: []
        };
        this.buffer = 5;
        this.accountsStreamed = 0;
        this.accountsFetched = 0;
        this.accountsInserted = 0;
        this.streamFinished = false;
        this.isPaused = false;
        this.lock = new Lock(httpEndpoints.length);
    }

    async start() {
        const date = new Date();
        this.dayId = TimeUtil.dayId(date);
        logger.info('Loading account balances.... For date: ', date);
        this.dbCon = await DBCon.createConnection(this.config.db);
        this.dbConStream = mysqlStream.createConnection(this.config.db);
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
        logger.info(`Loading accounts from: ${offset}`);
        this.dbConStream.on('error', err => {
            logger.error('Connection Error:', err);
            this._handleReconnect();
        });
        this.query = this.accountDao.selectStream(offset);
        this.query
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
                        staked = voter_info.staked / General.STAKED_MULTIPLIER;
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
                if (this.streamFinished && this.accountsFetched == this.accountsStreamed) {
                    logger.info('Finshed processing accounts. Flushing last inserts...')
                    await this.accountBalanceDao.flush();
                    await this.dbCon.end();
                    logger.info('Finished updating database. Connection closed.');
                }
            })
            .on('end', async () => {
                logger.info('All rows have been streamed. Waiting for processing to finish...');
                this._closeStreamConnection('End of processing.');
                this.streamFinished = true;

            })
            .on('error', async err => {
                logger.error('Stream Error:', err);
                this._handleReconnect();
            });

    }
    _closeStreamConnection(label) {
        logger.info(`Ending stream connection....${label}`);
        this.dbConStream.end(function (err) {
            if (err) {
                logger.error(`Error ending stream connection. ${label}`, err);
                return;
            }
            logger.info(`Ended stream connection. ${label}`);
        });
    }

    _handleReconnect() {
        logger.info('Reconnecting...');
        this.isPaused = false;
        this.query.removeAllListeners();
        this._closeStreamConnection('Handling reconnect.');
        this.dbConStream = mysqlStream.createConnection(this.config.db);
        logger.info('Created new connection. Loading remaining accounts...');
        this.accountDao.dbConStream = this.dbConStream;
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