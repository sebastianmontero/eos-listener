
const BaseTopology = require('./BaseTopology');
const dbCon = require('./db/DBConnection');
const { AccountDao } = require('./dao');
const { DappTypeIds } = require('./const');
const config = require('config');
const logger = require('./Logger');

logger.configure('exchange-loader');


class ExchangeTopolgy extends BaseTopology {


    async getQuery() {
        dbCon.init(config.db);
        const accountDao = new AccountDao(dbCon);
        const tokenAccounts = await accountDao.selectByDappType(DappTypeIds.TOKEN);
        const exchangeAccounts = await accountDao.selectByDappType(DappTypeIds.EXCHANGE);
        await dbCon.end();

        if (tokenAccounts.length === 0) {
            throw new Error('No token accounts');
        }

        if (exchangeAccounts.length === 0) {
            throw new Error('No exchange accounts');
        }

        const toOrQuery = (accounts, queryField) => {
            let orQuery = '';
            for (let account of accounts) {
                orQuery += ` OR ${queryField}:${account.account_name}`;
            }
            return `(${orQuery.substr(4)})`;
        }

        return `${toOrQuery(tokenAccounts, 'account')} action:transfer ${toOrQuery(exchangeAccounts, 'data.to')}`;
    }

    async getNodes() {


        const actionTraces = {
            'token-trade': {
                query: await this.getQuery(),
                blockNum: "56928684",
                outputKey: "token-trade",
                serialized: true,
            }
        };

        const config = this.config;
        let nodes = [{
            id: 'gql-eos-listener',
            node: 'GQLEOSListener',
            outputs: {
                'token-trade': 'token-trade',
            },
            config,
            actionTraces,
        },
        {
            id: 'exchange-trade-interpreter',
            node: 'ExchangeTradeInterpreter',
            input: 'token-trade',
            output: 'trade',
            config,
        },
        {
            id: 'exchange-trade-table-updater',
            node: 'ExchangeTradeTableUpdater',
            input: 'trade',
            config,
        }];
        return nodes;
    }
}

new ExchangeTopolgy('exchange-topology', {
    config,
}).start();

