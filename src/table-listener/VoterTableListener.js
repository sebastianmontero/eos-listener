const BaseTableListener = require('./BaseTableListener');
const { AccountTypeIds, SpecialValues, DappTableIds, TableListenerModes, VoterTypeIds } = require('../const');
const { EOSUtil } = require('../util');
const { logger } = require('../Logger');

const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

class VoterTableListener extends BaseTableListener {
    constructor({
        accountDao,
        blockProducerVotesHistoryDao,
        tokenDao,
        dappTableDao,
        blockProducerDao,
        voterDao,
        voterBlockProducerDao,
        voterBlockProducerHistoryDao,
        votingPowerHistoryDao,
    }) {
        super({
            dappTableId: DappTableIds.EOSIO_VOTERS,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.blockProducerDao = blockProducerDao;
        this.blockProducerVotesHistoryDao = blockProducerVotesHistoryDao;
        this.voterDao = voterDao;
        this.voterBlockProducerDao = voterBlockProducerDao;
        this.voterBlockProducerHistoryDao = voterBlockProducerHistoryDao;
        this.votingPowerHistoryDao = votingPowerHistoryDao;
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
            const id = await this.accountDao.getAccountId(bp, AccountTypeIds.BLOCK_PRODUCER, NOT_APPLICABLE);
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
            votes: EOSUtil.normalizeStaked(staked),
            proxy: proxy,
            proxiedVotes: 0,
        };
    }

    _proxyExists(accountName) {
        return !!this.proxies[accountName];
    }


    _getProxy(accountName) {
        return this.proxies[accountName];
    }

    async _processRow(row) {
        let processed = this._extractFields(row);
        processed.voterId = await this._getAccountId(processed.accountName);
        return processed;
    }

    async _handleProxiedVotesChange(voter, oldVoter, updateDB = false) {
        let oldProxy = oldVoter && oldVoter.proxy && this._getProxy(oldVoter.proxy);
        let proxy = voter.proxy && this._getProxy(voter.proxy);
        if (proxy == oldProxy && oldVoter && oldVoter.votes == voter.votes) {
            return proxy;
        }
        if (oldProxy) {
            oldProxy.proxiedVotes -= voter.votes;
        }
        if (proxy) {
            proxy.proxiedVotes += voter.votes;
        }
        if (updateDB) {
            if (oldProxy) {
                await this._updateVotes(oldProxy);
            }
            if (proxy && proxy != oldProxy) {
                await this._updateVotes(proxy);
            }
        }
        return proxy;

    }
    async _processProducers(voter, proxy) {
        let votersProducers = [];
        if (proxy) {
            votersProducers.push([
                voter.voterId,
                SpecialValues.NOT_APPLICABLE.id,
                proxy.voterId,
                voter.votes,
                0,
            ]);
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
                voter.proxiedVotes,
            ]);
        }
        return votersProducers;
    }

    _extractProxies(rows) {
        let proxies = [];
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            if (this._isProxy(row)) {
                proxies.push(row);
                rows[i] = null;
            }
        }
        return proxies;
    }

    _isProxy(row) {
        return Number(row.is_proxy) === 1;
    }

    _hasProducers(row) {
        return row.producers.length;
    }

    async _processVoters(rows, start, end) {
        let inserted = [];
        let accountNames = [];
        for (let j = start; j < end; j++) {
            if (rows[j]) {
                const toInsert = this._extractFields(rows[j]);
                inserted.push(toInsert);
                accountNames.push(toInsert.accountName);
            }
        }
        const usersToIds = await this.accountDao.getAccountIds(accountNames, AccountTypeIds.USER, NOT_APPLICABLE);
        let voters = [];
        let votersMap = {};
        for (let voter of inserted) {
            voter.voterId = usersToIds[voter.accountName];
            voters.push([
                voter.voterId,
                voter.voterTypeId,
            ]);
            votersMap[voter.accountName] = voter;
        }
        logger.info(`Inserting Voters from: ${start} to ${end}... Length: ${voters.length}`, new Date());
        await this.voterDao.insert(voters);
        logger.info(`Inserted Voters.`);
        return votersMap;
    }

    async _processVotersProducers(votersMap) {
        let votersProducers = [];
        for (let voter of Object.values(votersMap)) {
            let proxy = await this._handleProxiedVotesChange(voter);
            let vps = await this._processProducers(voter, proxy);
            votersProducers = votersProducers.concat(vps);
        }
        logger.info(`Inserting VotersProducers... Length VotersProducers: ${votersProducers.length}`, new Date());
        await this.voterBlockProducerDao.insert(votersProducers);
        logger.info(`Inserted VotersProducers.`, new Date());
    }

    async _processProxies(rows) {
        logger.info('Processing proxies...', new Date());
        let proxies = this._extractProxies(rows);
        this.proxies = await this._processVoters(proxies, 0, proxies.length, true);
        logger.info(`Finished processing proxies. Number of proxies: ${proxies.length}`, new Date());
    }

    async snapshot(payload) {
        let { rows } = payload;

        logger.info('Started processing voter snapshot. Truncating voterBlockProducerTable...', new Date());
        await this.voterBlockProducerDao.truncate();
        await this._processProxies(rows);
        let numBatches = Math.ceil(rows.length / this.batchSize);
        for (let i = 0; i < numBatches; i++) {
            let start = i * this.batchSize;
            let end = Math.min(rows.length, start + this.batchSize);
            let voters = await this._processVoters(rows, start, end);
            await this._processVotersProducers(voters)
        }
        await this._processVotersProducers(this.proxies);
        logger.info('Finished processing voter snapshot', new Date());

    }

    async insert(payload) {
        const voter = await this._processRow(payload.newRow);
        const { voterId, voterTypeId } = voter;
        await this.voterDao.insert([
            voterId,
            voterTypeId,
        ]);
        let chosenProxy = await this._handleProxiedVotesChange(voter, null, true);
        let vps = await this._processProducers(voter, chosenProxy);
        await this.voterBlockProducerDao.insert(vps);
        if (voter.voterTypeId === VoterTypeIds.PROXY) {
            this.proxies[voter.accountName] = voter;
        }
    }

    async update(payload) {
        const voter = await this._processRow(payload.newRow);
        const oldVoter = this._extractFields(payload.oldRow);
        const { modifiedProps } = payload;
        const { voterId, voterTypeId, accountName } = voter;
        let proxy = this._getProxy(accountName);

        if (voterTypeId === VoterTypeIds.PROXY) {
            if (proxy) {
                voter.proxiedVotes = proxy.proxiedVotes;
            }
            this.proxies[accountName] = voter;
        } else {
            if (proxy) {
                delete this.proxies[accountName];
            }
        }
        if (modifiedProps.is_proxy) {
            await this.voterDao.insert([
                voterId,
                voterTypeId,
            ]);
        }
        let chosenProxy = await this._handleProxiedVotesChange(voter, oldVoter, true);
        let vps = await this._processProducers(voter, chosenProxy);
        await this.voterBlockProducerDao.revote(voterId, vps);
    }

    async _updateVotes(voter) {
        const { voterId, votes, proxiedVotes } = voter;
        await this.voterBlockProducerDao.updateVotes(voterId, votes, proxiedVotes);
    }

    async remove(payload) {
        const { voterId } = await this._processRow(payload.oldRow);
        await this.voterBlockProducerDao.deleteByVoterId(voterId);
        //await this.voterDao.delete(voterId);
    }

    async _getAccountId(owner) {
        return await this.accountDao.getAccountId(owner, AccountTypeIds.USER, NOT_APPLICABLE);
    }


    async takeSnapshot(date) {
        const dayId = await this.voterBlockProducerHistoryDao.takeSnapshot(date);
        await this.blockProducerVotesHistoryDao.updateDay(dayId);
        await this.votingPowerHistoryDao.updateDay(dayId);
    }

    reset() {
        this.proxies = null;
    }
}

module.exports = VoterTableListener;
