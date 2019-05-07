
const BaseBatchDao = require('./BaseBatchDao');

class TransferDAO extends BaseBatchDao {
    constructor(dbCon) {
        super([], 1);
        this.dbCon = dbCon;
    }


    _toInsertArray({
        dappId,
        fromAccountId,
        toAccountId,
        quantity,
        quantityTokenId,
        transferTypeId,
        gyfterAccountId,
        dayId,
        hourOfDay,
        transferTime,
        blockNum,
        actionSeq,

    }) {
        return [
            dappId,
            fromAccountId,
            toAccountId,
            quantity,
            quantityTokenId,
            transferTypeId,
            gyfterAccountId,
            dayId,
            hourOfDay,
            transferTime,
            blockNum,
            actionSeq,
        ];
    }

    async _insert(values, toArray) {

        await this.dbCon.insertBatch(
            `INSERT INTO transfer(
                dapp_id,
                from_account_id,
                to_account_id,
                quantity,
                quantity_token_id,
                transfer_type_id,
                gyfter_account_id,
                day_id,
                hour_of_day,
                transfer_time,
                block_num,
                action_seq
                
            ) VALUES ?`,
            values,
            toArray);
    }

    async insert(values) {
        await this._insert(values);
    }

    async insertObj(objs) {
        await this._insert(objs, this._toInsertArray);
    }

}


module.exports = TransferDAO;