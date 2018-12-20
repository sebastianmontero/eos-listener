const BaseTableListener = require('./BaseTableListener');
const { logger } = require('../Logger');

class BaseBatchTableListener extends BaseTableListener {
    constructor({
        dappId,
        accountDao,
        tokenDao,
        dappTableDao,
    }) {
        super({
            dappId,
            accountDao,
            tokenDao,
            dappTableDao,
        });
        this.count = 0;
        this.batch = {}
        this.batchSize = 10;
    }

    async _insert(batchArray) {
        throw new Error('Method must be overriden by subclass');
    }

    async _addToBatch(id, toInsert) {

        this.batch[id] = toInsert;
        this.count++;
        logger.debug('Count: ', this.count);
        logger.debug(toInsert);
        if (this.count > this.batchSize) {
            const batchArray = Object.values(this.batch);
            this.batch = [];
            this.count = 0;
            await this._insert(batchArray);
        }
    }

    _getObj(id) {
        return this.batch[id];
    }

    _removeFromBatch(id) {
        if (id in this.batch) {
            this.count--;
            delete this.batch[id];
            logger.debug('Found in batch removed, id: ', id);
            return true;
        }
        return false;
    }



}

module.exports = BaseBatchTableListener;
