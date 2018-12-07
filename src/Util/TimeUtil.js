const DateDiff = require('date-diff');

const baseDate = new Date('1970-01-01');

class TimeUtil {

    static dayDiff(date1, date2) {
        const diff = new DateDiff(date1, date2);
        return diff.days();
    }

    static daysInYear(year) {
        return TimeUtil.dayDiff(new Date(year + 1, 0, 1), new Date(year, 0, 1));
    }

    static quarterId(year, quarter) {
        return parseInt(`${year}${quarter}`);
    }

    static quarterIdFromDate(date) {
        return TimeUtil.quarterId(date.getUTCFullYear(), Math.ceil((date.getUTCMonth() + 1) / 3));
    }

    static dayId(dayDate) {
        return TimeUtil.dayDiff(dayDate, baseDate);
    }

    static lmDayId(date) {
        const ldPrevMonth = new Date(date.getUTCFullYear(), date.getUTCMonth(), 0);
        const lmDate = ldPrevMonth.getUTCDate() <= date.getUTCDate() ? ldPrevMonth : new Date(date.getUTCFullYear(), date.getUTCMonth() - 1, date.getUTCDate());
        return TimeUtil.dayId(lmDate);
    }

    static lyDayId(date) {
        const ldPrevYear = new Date(date.getUTCFullYear() - 1, date.getUTCMonth() + 1, 0);
        const lmDate = ldPrevYear.getUTCDate() <= date.getUTCDate() ? ldPrevYear : new Date(date.getUTCFullYear() - 1, date.getUTCMonth(), date.getUTCDate());
        return TimeUtil.dayId(lmDate);
    }

    static monthId(year, month) {
        return parseInt(`${year}${month < 10 ? '0' : ''}${month}`);
    }

    static monthIdFromDate(date) {
        return TimeUtil.monthId(date.getUTCFullYear(), date.getUTCMonth() + 1);
    }
}

module.exports = TimeUtil;