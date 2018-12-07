const mysql = require('mysql');
const TimeUtil = require('../Util/TimeUtil');

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

    _loadYears(startYear, endYear) {
        console.log(`Loading years between start year: ${startYear} and ${endYear}...`)
        this._loadYearSpecialValues();
        for (let year = startYear; year <= endYear; year++) {
            const year_date = new Date(year, 0, 1);
            const toInsert = {
                year_id: year,
                time_type_id: 0,
                year_date,
                year_duration: TimeUtil.daysInYear(year),
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

    _loadQuarters(startYear, endYear) {
        console.log(`Loading quarters for years between: ${startYear} and ${endYear}.`);
        this._loadQuarterSpecialValues();
        for (let year = startYear; year <= endYear; year++) {
            let prev_quarter_id = TimeUtil.quarterId(year - 1, 4);
            for (let quarter = 1; quarter <= 4; quarter++) {
                const quarter_id = TimeUtil.quarterId(year, quarter);
                const quarter_date = new Date(year, (quarter - 1) * 3, 1);
                const next_quarter_date = new Date(quarter === 4 ? year + 1 : year, (quarter % 4) * 3, 1);
                const toInsert = {
                    quarter_id,
                    time_type_id: 0,
                    quarter_desc: `${year} Q${1}`,
                    quarter_date: quarter_date,
                    quarter_duration: TimeUtil.dayDiff(next_quarter_date, quarter_date),
                    prev_quarter_id,
                    ly_quarter_id: TimeUtil.quarterId(year - 1, quarter),
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

    _loadMonths(startYear, endYear) {
        console.log(`Loading months for years between: ${startYear} and ${endYear}.`);
        this._loadMonthSpecialValues();
        for (let year = startYear; year <= endYear; year++) {
            let prev_month_id = TimeUtil.monthId(year - 1, 12);
            for (let month = 1; month <= 12; month++) {
                const month_id = TimeUtil.monthId(year, month);
                const month_date = new Date(year, month - 1, 1);
                const next_month_date = new Date(month === 12 ? year + 1 : year, (month % 12), 1);
                const toInsert = {
                    month_id,
                    time_type_id: 0,
                    month_desc: `${month_date.toLocaleString(this.locale, { month: "short" })} ${year}`,
                    month_date,
                    month_duration: TimeUtil.dayDiff(next_month_date, month_date),
                    prev_month_id,
                    ly_month_id: TimeUtil.monthId(year - 1, month),
                    month_of_year: month,
                    quarter_id: TimeUtil.quarterIdFromDate(month_date),
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

    _loadDays(startYear, endYear) {
        console.log(`Loading days for years between: ${startYear} and ${endYear}.`);
        this._loadDaySpecialValues();
        for (let year = startYear; year <= endYear; year++) {
            let daysInYear = TimeUtil.daysInYear(year);
            for (let dayOfYear = 1; dayOfYear <= daysInYear; dayOfYear++) {
                const day_date = new Date(year, 0, dayOfYear);
                const day_id = TimeUtil.dayId(day_date);
                const toInsert = {
                    day_id,
                    time_type_id: 0,
                    day_date,
                    prev_day_id: day_id - 1,
                    lm_day_id: TimeUtil.lmDayId(day_date),
                    ly_day_id: TimeUtil.lyDayId(day_date),
                    month_id: TimeUtil.monthIdFromDate(day_date),
                    quarter_id: TimeUtil.quarterIdFromDate(day_date),
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
                        month_id: TimeUtil.monthId(year, month),
                        ytm_month_id: TimeUtil.monthId(year, ytm),
                    })
                }
            }
        }
        console.log('Finished loading year to month...');
    }
}

module.exports = DateLoader;