const BaseTableListenerConfig = require('./BaseTableListenerConfig');
const { DappTableIds, TableListenerModes } = require('../const');


class VoterTableListenerConfig extends BaseTableListenerConfig {
    constructor({
        dappTableDao
    }) {
        super({
            dappTableId: DappTableIds.EOSIO_VOTERS,
            dappTableDao,
        });
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
    }
}

module.exports = VoterTableListenerConfig;
