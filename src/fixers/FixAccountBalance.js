const dbCon = require('../db/DBConnection');
const { AccountBalanceDao } = require('../dao');

class FixAccountBalance {

    async fix() {
        const accountBalanceDao = new AccountBalanceDao(dbCon);
        const dayRange = await accountBalanceDao.selectDayRange();

        if (!dayRange) {
            console.log('No days to fix.');
            return;
        }
        const {
            minDayId,
            maxDayId,
        } = dayRange;

        console.log(`Fixing from ${minDayId} to ${maxDayId}...`);

        for (let dayId = minDayId + 1; dayId <= maxDayId; dayId++) {
            console.log(`Fixing day: ${dayId}...`);
            await accountBalanceDao.fixDay(dayId);
        }

        console.log(`Closing DB connection...`);
        await dbCon.end();
        console.log(`Good Bye!`);

    }

}

module.exports = FixAccountBalance;