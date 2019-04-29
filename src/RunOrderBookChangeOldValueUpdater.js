const config = require('config');
const dbCon = require('./db/DBConnection');
const { OrderBookChangeDao } = require('./dao');

dbCon.init(config.db);

class OrderBookChangeOldValueUpdater {

    async update() {
        const orderBookChangeDao = new OrderBookChangeDao(dbCon);
        console.log('Selecting Prev Orders Match...');
        const orderBooks = await orderBookChangeDao.selectPrevOrdersMatch();

        let prevOrderBookChangeId = null;
        for (const orderBook of orderBooks) {
            const { orderBookChangeId, oldAmount, oldOrderValue } = orderBook;
            if (prevOrderBookChangeId === null || prevOrderBookChangeId !== orderBookChangeId) {
                console.log(`Updating order: ${orderBookChangeId}..`);
                await orderBookChangeDao.updateOldValues({
                    orderBookChangeId,
                    oldAmount,
                    oldOrderValue
                });
            }
            prevOrderBookChangeId = orderBookChangeId;
        }
        console.log('Closing connection...');
        await dbCon.end();
    }
}

new OrderBookChangeOldValueUpdater().update();