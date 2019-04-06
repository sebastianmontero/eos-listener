class BlockProgress {
    constructor(serializedState) {
        this.deserialize(serializedState);
    }

    serialize() {
        return JSON.stringify(this.getState());
    }

    deserialize(serializedState) {
        console.log(serializedState);
        const state = serializedState ? JSON.parse(serializedState) : {};
        console.log(state);
        this.setState(state);
    }

    setState({
        blockNum = -1,
        trxIds = {}
    }) {
        this.blockNum = blockNum;
        this.trxIds = trxIds;
    }

    getState() {
        return {
            blockNum: this.blockNum,
            trxIds: this.trxIds,
        }
    }

    getStartBlock(startBlock) {
        return startBlock || this.blockNum < 0 ? startBlock : this.blockNum;
    }

    /**
     * 
     * @param {blockNum, trxId, idx} trxId is the transaction id for action traces, and the primary key of the table for tableListeners 
     */
    shouldProcessBlock({
        blockNum,
        trxId,
        idx,
    }) {
        if (blockNum < this.blockNum) {
            return false;
        } else if (blockNum == this.blockNum) {
            let processedIdxs = this.trxIds[trxId];
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

        if (this.blockNum == blockNum && trxId !== undefined) {
            if (!this.trxIds[trxId]) {
                this.trxIds[trxId] = {};
            }
            this.trxIds[trxId][idx] = true;
        }
    }

    _reset(blockNum) {
        this.blockNum = blockNum;
        this.trxIds = {};
    }
}

module.exports = BlockProgress;