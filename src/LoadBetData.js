const figlet = require('figlet');
const Snowflake = require('snowflake-promise').Snowflake;
const EOSListener = require('./EOSListener');
const { TimeUtil, Util } = require('./util');
const { AccountTypeIds, SpecialValues, DappTypeIds } = require('./const');
const { AccountDao, ActionDao, TokenDao, DappTableDao, BetDao } = require('./dao');
const { logger } = require('./Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;

class LoadBetData {
    constructor(config) {
        this.config = config;
        const {
            eoswsToken,
            origin,
            eoswsEndpoint,
            db,
        } = config;

        this.listener = new EOSListener({
            eoswsToken,
            origin,
            eoswsEndpoint,
        });

        this.snowflake = new Snowflake(db);
        this.accountDao = new AccountDao(this.snowflake);
        this.actionDao = new ActionDao(this.snowflake);
        this.tokenDao = new TokenDao(this.snowflake);
        this.dappTableDao = new DappTableDao(this.snowflake);
        this.betDao = new BetDao(this.snowflake);

    }

    printFiglet() {
        figlet('Loading Bet Data', {
            font: "Big",
            horizontalLayout: 'default',
            verticalLayout: 'default'
        }, (err, data) => {
            if (err) {
                console.log('Something went wrong...');
                console.dir(err);
                return;
            }
            console.log(data)
            console.log("");
            console.log("----- Using Configuration ---- ")
            console.log(this.config);
            console.log("----- End Configuration ---- ")
            console.log("\n\n ")

        });

    }

    async _getGamblingDappTableListeners() {
        const dappTables = await this.dappTableDao.selectByDappTypeId(DappTypeIds.GAMBLING);
        let listeners = [];
        for (let dappTable of dappTables) {
            listeners.push({
                dappTableId: dappTable.DAPP_TABLE_ID,
                code: dappTable.CODE_ACCOUNT_NAME,
                scope: dappTable.SCOPE_ACCOUNT_NAME,
                table: dappTable.DAPP_TABLE_NAME,
            });
        }
        return listeners;
    }


    async start() {

        this.printFiglet();

        try {
            await this.snowflake.connect();
            console.log("Getting gambling table listeners:");
            const betTables = await this._getGamblingDappTableListeners();
            console.log(betTables);

            this.listener.addTableListeners({
                tables: betTables,
                insertCallbackFn: async payload => {

                    console.log('---INSERT---');
                    console.dir(payload.message);
                    console.dir(payload.dbop.new);
                },
                updateCallbackFn: async payload => {
                    console.log('---UPDATE---');
                    console.dir(payload.message);
                    console.dir(payload.dbop.old);
                    console.dir(payload.dbop.new);
                },
                removeCallbackFn: async payload => {
                    console.log('---REMOVE---');
                    console.dir(payload.message);
                    console.dir(payload.dbop.old);
                },

            });
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = LoadBetData;
