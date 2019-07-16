const BaseTableListener = require('./BaseTableListener');
const { DappTableIds, TableListenerModes, } = require('../const');

class RawVoterTableListener extends BaseTableListener {
    constructor({
        accountDao,
        tokenDao,
        dappTableDao,
        votersRawDao,
    }) {
        super({
            dappTableId: DappTableIds.EOSIO_VOTERS,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.votersRawDao = votersRawDao;
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
        this.batchSize = 5000;
    }

    _extractFields(row) {
        const {
            owner,
            producers,
            staked,
            proxy,
            is_proxy,
        } = row;

        return {
            voter: owner,
            producers,
            staked,
            proxy: proxy,
            isProxy: is_proxy,
        };
    }

    async snapshot(payload) {
        let { rows } = payload;

        console.log('Started processing voter snapshot. Truncating votersRaw...', new Date());
        await this.votersRawDao.truncate();
        let toInsert = [];
        let count = 0;
        for (let row of rows) {
            let { voter, proxy, producers, staked, isProxy } = this._extractFields(row);
            toInsert.push([
                voter,
                proxy.trim() === '' ? null : proxy,
                producers.length ? JSON.stringify(producers) : null,
                staked,
                isProxy,
            ]);
            count++;
            if (toInsert.length > this.batchSize) {
                console.log(`Inserting rows....Progress: ${count}/${rows.length}`);
                await this.votersRawDao.insert(toInsert);
                toInsert = [];
            }

        }
        console.log('Finished processing voter snapshot', new Date());

    }

    async takeSnapshot(date) {
        /*  const dayId = await this.voterBlockProducerHistoryDao.takeSnapshot(date);
         await this.blockProducerVotesHistoryDao.updateDay(dayId); */
    }

    reset() {
        this.proxies = null;
    }
}

module.exports = RawVoterTableListener;
