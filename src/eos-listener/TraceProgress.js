class TraceProgress {

    constructor({
        blockNum,
        actionSeq,
    }) {
        this.setState({
            blockNum,
            actionSeq
        })
    }

    setState({
        blockNum,
        actionSeq,
    }) {
        this.blockNum = blockNum;
        this.actionSeq = actionSeq;
    }

    getState() {
        return {
            blockNum: this.blockNum,
            actionSeq: this.actionSeq,
        };
    }

    /**
     * 
     * @param {blockNum, trxId, idx} trxId is the transaction id for action traces, and the primary key of the table for tableListeners 
     */
    shouldProcessAction({
        blockNum,
        actionSeq,
    }) {

        if (this.blockNum != null) {
            if (blockNum < this.blockNum) {
                return false;
            } else if (blockNum == this.blockNum) {
                if (this.actionSeq == null || actionSeq == null || actionSeq <= this.actionSeq) {
                    return false;
                }
            }
        }
        return true;
    }

    processedAction({
        blockNum,
        actionSeq,
    }) {
        this.setState({ blockNum, actionSeq });
    }
}

module.exports = TraceProgress;