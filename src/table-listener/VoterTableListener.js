const BaseTableListener = require('./BaseTableListener');
const { AccountTypeIds, SpecialValues, DappTableIds, General, TableListenerModes, VoterTypeIds } = require('../const');
const { logger } = require('../Logger');

const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class VoterTableListener extends BaseTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        blockProducerDao,
        voterDao,
        voterBlockProducerDao,
    }) {
        super({
            dappTableId: DappTableIds.EOSIO_VOTERS,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.blockProducerDao = blockProducerDao;
        this.voterDao = voterDao;
        this.voterBlockProducerDao = voterBlockProducerDao;
        this.streamOptions = {
            ...this.streamOptions,
            fetch: true,
            mode: TableListenerModes.REPLICATE,
            tableId: 'owner',
            serializeRowUpdates: true,
        };
        this.fieldsOfInterest = [
            'producers',
            'staked',
            'proxy',
            'is_proxy',
            'proxied_vote_weight'
        ];
        this.batchSize = 50000;
        this.bpIds = null;
        this.proxies = null;
    }

    async _getBPId(bp) {
        if (!this.bpIds) {
            this.bpIds = await this.blockProducerDao.mapAccountNameToId();
        }
        if (!this.bpIds[bp]) {
            const id = await this.accountDao.selectAccountId(bp);
            if (id === null) {
                throw new Error(`Block producer: ${bp} does not exist`);
            }
            this.bpIds[bp] = id;
        }
        return this.bpIds[bp];
    }

    _extractFields(row) {
        const {
            owner,
            producers,
            staked,
            proxy,
        } = row;

        return {
            accountName: owner,
            producers: producers,
            voterTypeId: this._isProxy(row) ? VoterTypeIds.PROXY : VoterTypeIds.NORMAL,
            votes: staked / General.STAKED_MULTIPLIER,
            proxy: proxy
        };
    }

    _proxyExists(accountName) {
        return !!this.proxies[accountName];
    }


    _getProxy(accountName) {
        if (!this._proxyExists(accountName)) {
            logger.error(`${accountName} proxy does not exist.`);
            return null;
        }
        return this.proxies[accountName];
    }

    async _processRow(row) {
        let processed = this._extractFields(row);
        processed.voterId = await this._getAccountId(processed.accountName);
        return processed;
    }

    async _processProducers(voter) {
        let votersProducers = [];

        if (voter.proxy) {
            console.log('Voter:');
            console.dir(voter);
            let proxy = this._getProxy(voter.proxy);
            if (proxy) {
                voter.proxyId = proxy.voterId;
                voter.producers = proxy.producers;
            } else {
                voter.proxyId = SpecialValues.NOT_PROXIED.id;
            }
        } else if (voter.voterTypeId === VoterTypeIds.PROXY) {
            voter.proxyId = voter.voterId;
        } else {
            voter.proxyId = SpecialValues.NOT_PROXIED.id;
        }

        for (let bp of voter.producers) {
            const bpId = await this._getBPId(bp);
            votersProducers.push([
                voter.voterId,
                bpId,
                voter.proxyId,
                voter.votes,
            ]);
        }
        return votersProducers;
    }

    _extractProxies(rows) {
        let proxies = [];
        for (let i = 0; i < rows.length; i++) {
            if (this._isProxy(rows[i])) {
                proxies.push(rows[i]);
                rows[i] = null;
            }
        }
        return proxies;
    }

    _isProxy(row) {
        const { is_proxy, proxied_vote_weight, proxy } = row;
        return !proxy && (Number(is_proxy) === 1 || proxied_vote_weight > 0);
    }

    async _processVotes(rows, start, end, keepTrack = false) {
        let inserted = [];
        let accountNames = [];
        let track = {};
        for (let j = start; j < end; j++) {
            if (rows[j]) {
                const toInsert = this._extractFields(rows[j]);
                if (toInsert.votes > 0 || toInsert.voterTypeId === VoterTypeIds.PROXY) {
                    inserted.push(toInsert);
                    accountNames.push(toInsert.accountName);
                }
            }
        }
        const usersToIds = await this.accountDao.getAccountIds(accountNames, AccountTypeIds.USER, NOT_APPLICABLE);
        let voters = [];
        let votersProducers = [];
        for (let voter of inserted) {
            voter.voterId = usersToIds[voter.accountName];
            voters.push([
                voter.voterId,
                voter.voterTypeId,
            ]);
            let vps = await this._processProducers(voter);
            votersProducers = votersProducers.concat(vps);
            if (keepTrack) {
                track[voter.accountName] = voter;
            }
        }
        await this.voterDao.insert(voters);
        logger.info(`Loaded Voters from: ${start} to ${end}. Length: ${voters.length}`, new Date());
        await this.voterBlockProducerDao.insert(votersProducers);
        logger.info(`Loaded Votes from: ${start} to ${end}. Length VotersProducers: ${votersProducers.length}`, new Date());
        return track;
    }

    async _processProxies(rows) {
        logger.info('Processing proxies...', new Date());
        let proxies = this._extractProxies(rows);
        this.proxies = await this._processVotes(proxies, 0, proxies.length, true);
        logger.info(`Finished processing proxies. Number of proxies: ${proxies.length}`, new Date());
    }

    async snapshot(payload) {
        let { rows } = payload;
        logger.info('Started processing voter snapshot', new Date());
        await this._processProxies(rows);
        let numBatches = Math.ceil(rows.length / this.batchSize);
        for (let i = 0; i < numBatches; i++) {
            let start = i * this.batchSize;
            let end = Math.min(rows.length, start + this.batchSize);
            await this._processVotes(rows, start, end);
        }
        logger.info('Finished processing voter snapshot', new Date());

    }

    async insert(payload) {
        const voter = await this._processRow(payload.newRow);
        const { voterId, voterTypeId } = voter;
        await this.voterDao.insert([
            voterId,
            voterTypeId,
        ]);
        await this.voterBlockProducerDao.insert(await this._processProducers(voter));
        if (voter.voterTypeId === VoterTypeIds.PROXY) {
            this.proxies[voter.accountName] = voter;
        }
    }

    async update(payload) {
        const voter = await this._processRow(payload.newRow);
        const { modifiedProps } = payload;
        const { voterId, votes } = voter;
        if (!modifiedProps.producers) {
            await this.voterBlockProducerDao.updateVotes(voterId, votes);
        } else {
            await this.voterBlockProducerDao.revote(voterId, await this._processProducers(voter));
        }
        if (voter.voterTypeId === VoterTypeIds.PROXY) {
            this.proxies[voter.accountName] = voter;
        }
    }

    async remove(payload) {
        const { voterId } = await this._processRow(payload.oldRow);
        await this.voterBlockProducerDao.deleteByVoterId(voterId);
        await this.voterDao.delete(voterId);
    }

    async _getAccountId(owner) {
        return await this.accountDao.getAccountId(owner, AccountTypeIds.USER, NOT_APPLICABLE);
    }
}

module.exports = VoterTableListener;
