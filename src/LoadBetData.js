const figlet = require('figlet');
const Snowflake = require('snowflake-promise').Snowflake;
const EOSListener = require('./EOSListener');
const { TimeUtil, Util } = require('./util');
const { AccountTypeIds, SpecialValues, DappTypeIds, DappIds, BetStatusIds } = require('./const');
const { AccountDao, ActionDao, TokenDao, DappTableDao, BetDao } = require('./dao');
const { logger } = require('./Logger');

const UNKNOWN = SpecialValues.UNKNOWN.id;
const NOT_APPLICABLE = SpecialValues.NOT_APPLICABLE.id;

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

    async _getGamblingDappTableListeners(dappId) {
        const dappTables = await this.dappTableDao.selectByDappId(dappId);
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
            const betTables = await this._getGamblingDappTableListeners(DappIds.FISH_JOY);
            console.log(betTables);
            let batch = {};
            let count = 0;
            this.listener.addTableListeners({
                tables: betTables,
                insertCallbackFn: async payload => {
                    const { dappTableId, newRow, newRow: { id, buyer, eosToken, create_time, result } } = payload;
                    console.log('---INSERT---', dappTableId);
                    console.dir(payload.message);
                    console.log('New Row');
                    console.dir(newRow);

                    const { amount: betAmount, symbol: betSymbol } = Util.parseAsset(eosToken);
                    const betTokenId = await this.tokenDao.getTokenId(betSymbol, UNKNOWN);

                    let winAmount, winTokenId, betStatusId;

                    winTokenId = betTokenId;

                    if (result == 1) {
                        winAmount = betAmount;
                        betStatusId = BetStatusIds.COMPLETED;
                    } else {
                        winAmount = 0;
                        betStatusId = UNKNOWN;
                    }
                    const placedDate = new Date(create_time + 'Z');
                    const placedDayId = TimeUtil.dayId(placedDate);

                    const toInsert = {
                        dappTableId,
                        gameBetId: id,
                        userAccountId: await this.accountDao.getAccountId(buyer, AccountTypeIds.USER, NOT_APPLICABLE),
                        betAmount,
                        betTokenId,
                        winAmount,
                        winTokenId,
                        betStatusId,
                        placedDayId,
                        placedHourOfDay: placedDate.getUTCHours(),
                        placedTime: create_time,
                        completedDayId: UNKNOWN,
                        completedHourOfDay: null,
                        completedTime: null,
                    };
                    batch[id] = toInsert;
                    count++;
                    console.log('Count: ', count);
                    console.dir(toInsert);
                    if (count > 100) {
                        const batchArray = Object.values(batch);
                        batch = [];
                        count = 0;
                        await this.betDao.insert(batchArray);
                    }

                },
                updateCallbackFn: async payload => {
                    const { dappTableId, newRow, newRow: { id, eosToken, result } } = payload;

                    console.log('---UPDATE---', dappTableId);
                    console.dir(payload.message);
                    console.log('New Row');
                    console.dir(newRow);

                    if (result == 1) {
                        if (id in batch) {
                            let bet = batch[id];
                            bet.winAmount = bet.betAmount;
                            bet.betStatusId = BetStatusIds.COMPLETED;
                            console.log('Found in batch, updated, id: ', id);
                        } else {
                            const { amount: winAmount, symbol: winSymbol } = Util.parseAsset(eosToken);
                            const winTokenId = await this.tokenDao.getTokenId(winSymbol, UNKNOWN);
                            const toUpdate = {
                                dappTableId,
                                gameBetId: id,
                                winAmount,
                                winTokenId,
                                betStatusId: BetStatusIds.COMPLETED,
                                completedDayId: UNKNOWN,
                                completedHourOfDay: null,
                                completedTime: null,
                            };
                            console.log(toUpdate);
                            await this.betDao.update(toUpdate);
                        }
                    }

                },
                removeCallbackFn: async payload => {

                    const { dappTableId, oldRow: { id } } = payload;
                    console.log('---UPDATE---', dappTableId);
                    console.dir(payload.message);
                    if (id in batch) {
                        count--;
                        delete batch[id];
                        console.log('Found in batch removed, id: ', id);
                    } else {
                        await this.betDao.remove({
                            dappTableId,
                            gameBetId: id,
                        });
                    }

                },

            });
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = LoadBetData;
