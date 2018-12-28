const { logger } = require('../Logger');

class BaseBatchDAO {
    constructor(batchId, batchSize) {
        this.batchId = batchId;
        this.count = 0;
        this.batch = {}
        this.batchSize = batchSize;
    }

    async _insert(values) {
        throw new Error('Method must be overriden by subclass');
    }

    _toInsertArray(obj) {
        throw new Error('Method must be overriden by subclass');
    }

    _getBatchId(obj) {
        return obj[this.batchId];
    }

    /**
     * 
     * @param {value|obj} obj should include the batch and table id 
     */
    async batchInsert(obj) {
        const _id = this._getBatchId(obj);
        this.batch[_id] = obj;
        this.count++;
        logger.debug('Count: ', this.count);
        logger.debug(obj);
        if (this.count >= this.batchSize) {
            await this.flush();
        }
    }

    async _update(obj) {
        throw new Error('Method must be overriden by subclass');
    }

    _updateBatchObj(obj) {
        const _id = this._getBatchId(obj);
        if (_id in this.batch) {
            this.batch[_id] = {
                ...this.batch[_id],
                ...obj
            }
            logger.debug('Found in batch, updated, id: ', _id);
            return true;
        }
        return false;
    }

    /**
     * 
     * @param {obj} obj should include the batch and table id 
     */
    async batchUpdate(obj) {
        if (!this._updateBatchObj(obj)) {
            await this._update(obj);
        }
    }

    /**
     * 
     * @param {obj} obj should include the batch and table id 
     */
    async batchRemove(obj) {
        const _id = this._getBatchId(obj);

        if (_id in this.batch) {
            this.count--;
            delete this.batch[_id];
            logger.debug('Found in batch removed, id: ', _id);
        } else {
            await this._remove(obj);
        }
    }

    /**
     * 
     * @param {value|obj} id if a composite id it will be an object with the properties that compose the id 
     */
    async _remove(id) {
        throw new Error('Method must be overriden by subclass');
    }

    async flush() {
        if (this.count > 0) {
            const batchArray = Object.values(this.batch);
            this.batch = [];
            this.count = 0;

            let values = [];
            for (let value of batchArray) {
                values.push(this._toInsertArray(value));
            }
            await this._insert(values);
        }
    }

}

module.exports = BaseBatchDAO;