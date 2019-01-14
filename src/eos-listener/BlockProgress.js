class BlockProgress {
    constructor({
        blockNum = -1,
        trxIds = {},
        idxs = {},
    }) {
        this.blockNum = blockNum;
        this.trxIds = trxIds;
        this.idxs = idxs;
    }

    getStartBlock(startBlock) {
        return startBlock || this.blockNum < 0 ? startBlock : this.blockNum;
    }

    shouldProcessBlock({
        blockNum,
        trxId,
        idx,
    }) {
        if (blockNum < this.blockNum) {
            return false;
        } else if (blockNum == this.blockNum) {
            let processedIdxs;
            if (trxId) {
                processedIdxs = this.trxIds[trxId];
            } else {
                processedIdxs = this.idxs;
            }
            if (processedIdxs && processedIdxs[idx]) {
                return false;
            }
        }
        return true;
    }

    processedBlock({
        blockNum,
        trxId,
        idx,
    }) {

        if (this.blockNum < blockNum) {
            this._reset(blockNum);
        }

        if (this.blockNum == blockNum) {
            let processedIdxs;
            if (trxId) {
                if (!this.trxIds[trxId]) {
                    processedIdxs = {}
                    this.trxIds[trxId] = processedIdxs;
                }
            } else {
                processedIdxs = this.idxs;
            }
            processedIdxs[idx] = true;
        }
    }

    _reset(blockNum) {
        this.blockNum = blockNum;
        this.trxIds = {};
        this.idxs = {};
    }
}

module.exports = BlockProgress;