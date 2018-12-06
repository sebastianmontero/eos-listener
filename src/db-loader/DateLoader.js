const mysql = require('mysql');
const DateDiff = require('date-diff');

const specialValues = [
    {
        id: -1,
        desc: 'Unknown',
    },
    {
        id: -2,
        desc: 'Not Applicable',
    },
    {
        id: -3,
        desc: 'Corrupted',
    },
    {
        id: -4,
        desc: "Hasn't Happened",
    }
];

class DateLoader {

    constructor(db, startYear, endYear, locale = 'en-us') {
        this.dbCon = mysql.createConnection(db);
        this.startYear = startYear;
        this.endYear = endYear;
        this.locale = locale;
        this.baseDate = new Date('1970-01-01');
    }

    load() {
        console.log(`Loading data between ${this.startYear} and ${this.endYear}`);
        this._loadYears(this.startYear, this.endYear);
        this._loadQuarters(this.startYear, this.endYear);
        this._loadMonths(this.startYear, this.endYear);
        this._loadDays(this.startYear, this.endYear);
        this._loadYtm(this.startYear, this.endYear);
        this.dbCon.end((error) => {
            if (error) {
                console.error('Unable to close mysql connection', error);
                throw error;
            }
        })
    }

    _insert(toInsert, table) {
        this.dbCon.query(`INSERT IGNORE INTO \`${table}\` SET ?`, [toInsert], (error) => {
            if (error) {
                console.error(`Unable to insert row into ${table}`, error);
                throw error;
            }
        });
    }


    _insertYear(toInsert) {
        this._insert(toInsert, 'year');
    }

    _insertQuarter(toInsert) {
        this._insert(toInsert, 'quarter');
    }

    _insertMonth(toInsert) {
        this._insert(toInsert, 'month');
    }

    _insertDay(toInsert) {
        this._insert(toInsert, 'day');
    }

    _insertYtm(toInsert) {
        this._insert(toInsert, 'ytm_month');
    }

    _loadYearSpecialValues() {
        for (let sv of specialValues) {
            const toInsert = {
                year_id: sv.id,
                time_type_id: sv.id,
            };
            this._insertYear(toInsert);
        }
    }

    _dayDiff(date1, date2) {
        const diff = new DateDiff(date1, date2);
        return diff.days();
    }
    _daysInYear(year) {
        return this._dayDiff(new Date(year + 1, 0, 1), new Date(year, 0, 1));
    }

    _loadYears(startYear, endYear) {
        console.log(`Loading years between start year: ${startYear} and ${endYear}...`)
        this._loadYearSpecialValues();
        for (let year = startYear; year <= endYear; year++) {
            const year_date = new Date(year, 0, 1);
            const toInsert = {
                year_id: year,
                time_type_id: 0,
                year_date,
                year_duration: this._daysInYear(year),
                prev_year_id: year - 1,
            };
            this._insertYear(toInsert);
        }
        console.log(`Finished loading years.`)
    }

    _loadQuarterSpecialValues() {
        for (let sv of specialValues) {
            const toInsert = {
                quarter_id: sv.id,
                time_type_id: sv.id,
                quarter_desc: sv.desc,
                year_id: sv.id
            };
            this._insertQuarter(toInsert);
        }
    }

    _quarterId(year, quarter) {
        return parseInt(`${year}${quarter}`);
    }

    _quarterIdFromDate(date) {
        return this._quarterId(date.getUTCFullYear(), Math.ceil((date.getUTCMonth() + 1) / 3));
    }

    _loadQuarters(startYear, endYear) {
        console.log(`Loading quarters for years between: ${startYear} and ${endYear}.`);
        this._loadQuarterSpecialValues();
        for (let year = startYear; year <= endYear; year++) {
            let prev_quarter_id = this._quarterId(year - 1, 4);
            for (let quarter = 1; quarter <= 4; quarter++) {
                const quarter_id = this._quarterId(year, quarter);
                const quarter_date = new Date(year, (quarter - 1) * 3, 1);
                const next_quarter_date = new Date(quarter === 4 ? year + 1 : year, (quarter % 4) * 3, 1);
                const toInsert = {
                    quarter_id,
                    time_type_id: 0,
                    quarter_desc: `${year} Q${1}`,
                    quarter_date: quarter_date,
                    quarter_duration: this._dayDiff(next_quarter_date, quarter_date),
                    prev_quarter_id,
                    ly_quarter_id: this._quarterId(year - 1, quarter),
                    year_id: year
                };
                this._insertQuarter(toInsert);
                prev_quarter_id = quarter_id;

            }
        }
        console.log('Finished loading quarters.');
    }

    _loadMonthSpecialValues() {
        for (let sv of specialValues) {
            const toInsert = {
                month_id: sv.id,
                time_type_id: sv.id,
                month_desc: sv.desc,
                month_of_year: sv.id,
                quarter_id: sv.id,
                year_id: sv.id,

            };
            this._insertMonth(toInsert);
        }
    }

    _monthId(year, month) {
        return parseInt(`${year}${month < 10 ? '0' : ''}${month}`);
    }

    _monthIdFromDate(date) {
        return this._monthId(date.getUTCFullYear(), date.getUTCMonth() + 1);
    }

    _loadMonths(startYear, endYear) {
        console.log(`Loading months for years between: ${startYear} and ${endYear}.`);
        this._loadMonthSpecialValues();
        for (let year = startYear; year <= endYear; year++) {
            let prev_month_id = this._monthId(year - 1, 12);
            for (let month = 1; month <= 12; month++) {
                const month_id = this._monthId(year, month);
                const month_date = new Date(year, month - 1, 1);
                const next_month_date = new Date(month === 12 ? year + 1 : year, (month % 12), 1);
                const toInsert = {
                    month_id,
                    time_type_id: 0,
                    month_desc: `${month_date.toLocaleString(this.locale, { month: "short" })} ${year}`,
                    month_date,
                    month_duration: this._dayDiff(next_month_date, month_date),
                    prev_month_id,
                    ly_month_id: this._monthId(year - 1, month),
                    month_of_year: month,
                    quarter_id: this._quarterIdFromDate(month_date),
                    year_id: year
                };
                this._insertMonth(toInsert);
                prev_month_id = month_id;

            }
        }
        console.log('Finished loading months.');
    }

    _loadDaySpecialValues() {
        for (let sv of specialValues) {
            const toInsert = {
                day_id: sv.id,
                time_type_id: sv.id,
                month_id: sv.id,
                quarter_id: sv.id,
                year_id: sv.id,

            };
            this._insertDay(toInsert);
        }
    }

    _dayId(dayDate) {
        return this._dayDiff(dayDate, this.baseDate);
    }

    _lmDayId(date) {
        const ldPrevMonth = new Date(date.getUTCFullYear(), date.getUTCMonth(), 0);
        const lmDate = ldPrevMonth.getUTCDate() <= date.getUTCDate() ? ldPrevMonth : new Date(date.getUTCFullYear(), date.getUTCMonth() - 1, date.getUTCDate());
        return this._dayId(lmDate);
    }

    _lyDayId(date) {
        const ldPrevYear = new Date(date.getUTCFullYear() - 1, date.getUTCMonth() + 1, 0);
        const lmDate = ldPrevYear.getUTCDate() <= date.getUTCDate() ? ldPrevYear : new Date(date.getUTCFullYear() - 1, date.getUTCMonth(), date.getUTCDate());
        return this._dayId(lmDate);
    }

    _loadDays(startYear, endYear) {
        console.log(`Loading days for years between: ${startYear} and ${endYear}.`);
        this._loadDaySpecialValues();
        for (let year = startYear; year <= endYear; year++) {
            let daysInYear = this._daysInYear(year);
            for (let dayOfYear = 1; dayOfYear <= daysInYear; dayOfYear++) {
                const day_date = new Date(year, 0, dayOfYear);
                const day_id = this._dayId(day_date);
                const toInsert = {
                    day_id,
                    time_type_id: 0,
                    day_date,
                    prev_day_id: day_id - 1,
                    lm_day_id: this._lmDayId(day_date),
                    ly_day_id: this._lyDayId(day_date),
                    month_id: this._monthIdFromDate(day_date),
                    quarter_id: this._quarterIdFromDate(day_date),
                    year_id: year
                };
                this._insertDay(toInsert);

            }
        }
        console.log('Finished loading days.');
    }

    _loadYtm(startYear, endYear) {
        console.log('Loading year to month...');
        for (let year = startYear; year < endYear; year++) {
            for (let month = 1; month <= 12; month++) {
                for (let ytm = 1; ytm <= month; ytm++) {
                    this._insertYtm({
                        month_id: this._monthId(year, month),
                        ytm_month_id: this._monthId(year, ytm),
                    })
                }
            }
        }
        console.log('Finished loading year to month...');
    }
}

module.exports = DateLoader;