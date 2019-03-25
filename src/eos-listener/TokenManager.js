const lockfile = require('proper-lockfile');
const fetch = require('node-fetch');
const HttpStatus = require('http-status-codes');
const dbCon = require('../db/DBConnection');
const AuthTokenDao = require('../dao/AuthTokenDao');
const { TimeUtil } = require('../util');
const { logger } = require('../Logger');

class TokenManager {

    constructor({ apiKey, authUrl, timeBuffer }) {
        this.apiKey = apiKey;
        this.authUrl = authUrl;
        this.timeBuffer = timeBuffer;
        this.authTokenDao = new AuthTokenDao(dbCon);
        this.tokenInfo = null;
    }

    async getToken() {
        let tokenInfo = await this._getCachedToken();
        if (!tokenInfo) {
            logger.info('Auth Token not cached, getting a new token...');
            const release = await lockfile.lock('../auth-token.lock');
            try {
                tokenInfo = await this._getCachedToken();
                if (!tokenInfo) {
                    logger.info(`Fetching a new Auth Token... url: ${this.authUrl}, key: ${this.apiKey}`);
                    tokenInfo = this.tokenInfo = await this._fetchToken();
                    logger.info('Auth Token fetched.', tokenInfo);
                    const { token, expires_at } = tokenInfo;
                    logger.info('Saving new Auth Token...');
                    await this.authTokenDao.insert([token, expires_at])
                }
            } finally {
                release();
            }
        }
        logger.info('Using auth token: ', tokenInfo);
        return tokenInfo.token;
    }

    async _getCachedToken() {
        let tokenInfo = this.tokenInfo = this.tokenInfo || await this.authTokenDao.select();
        return !tokenInfo || this.hasExpired(tokenInfo) ? null : tokenInfo;
    }

    hasExpired(tokenInfo) {
        return tokenInfo.expires_at < TimeUtil.toUnixTimestamp() + this.timeBuffer;
    }

    async _fetchToken() {
        const response = await fetch(this.authUrl, {
            method: 'post',
            body: JSON.stringify({
                api_key: this.apiKey,
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        const { status } = response;
        if (HttpStatus.OK == status) {
            return await response.json();
        } else {
            throw new Error(`Failed renewing dfuse API Token with status: ${status}`);
        }
    }
}

module.exports = TokenManager;