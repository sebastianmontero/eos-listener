const mysql = require('mysql2/promise');
const TimeUtil = require('../util/TimeUtil');
const { SpecialValues } = require('../const');

const specialValues = Object.values(SpecialValues);

class TimeDimensionLoader {

    constructor(db, startYear, endYear, locale = 'en-us') {
        this.dbConfig = db;
        this.startYear = startYear;
        this.endYear = endYear;
        this.locale = locale;
    }

    async load() {
        console.log(`Loading data between ${this.startYear} and ${this.endYear}`);
        console.log('Connecting to database...');

        try {
            this.dbCon = await mysql.createConnection(this.dbConfig);
            console.log('Connected to database.');
            let startYear = await this._getMaxYear();
            if (!startYear) {
                startYear = this.startYear;
                await this._loadSpecialValues();
            }
            if (startYear >= this.endYear) {
                console.log('Time dimension already loaded.');
                return;
            }
            await this._loadYears(startYear, this.endYear);
            await this._loadQuarters(startYear, this.endYear);
            await this._loadMonths(startYear, this.endYear);
            await this._loadDays(startYear, this.endYear);
            await this._loadYtm(startYear, this.endYear);
        } catch (error) {
            console.log(error);
            throw error;
        } finally {

            await this.dbCon.end();
            console.log('Disconnected from database');
        }
    }

    async _getMaxYear() {
        var [rows] = await this.dbCon.execute('SELECT max(year_id) max_year from year');
        return rows.length ? rows[0].max_year : null;
    }

    async _insertYear(toInsert) {
        await this.dbCon.query(
            `INSERT INTO year(year_id, time_type_id, year_date, year_duration, prev_year_id)
            VALUES ?`,
            [toInsert]
        );
    }

    async _insertQuarter(toInsert) {
        await this.dbCon.query(
            `INSERT INTO quarter(
                quarter_id,
                time_type_id,
                quarter_desc,
                quarter_date,
                quarter_duration,
                prev_quarter_id,
                ly_quarter_id,
                year_id)
            VALUES ?`,
            [toInsert]
        );
    }

    async _insertMonth(toInsert) {
        await this.dbCon.query(
            `INSERT INTO month(
                month_id,
                time_type_id,
                month_desc,
                month_date,
                month_duration,
                prev_month_id,
                ly_month_id,
                month_of_year,
                quarter_id,
                year_id)
            VALUES ?`,
            [toInsert]
        );
    }

    async _insertDay(toInsert) {
        await this.dbCon.query(
            `INSERT INTO day (
                day_id,
                time_type_id,
                day_date,
                prev_day_id,
                lm_day_id,
                ly_day_id,
                month_id,
                quarter_id,
                year_id)
            VALUES ?`,
            [toInsert]
        );
    }

    async _insertYtm(toInsert) {
        await this.dbCon.query(
            `INSERT INTO ytm_month(month_id,ytm_month_id) VALUES ?`,
            [toInsert]
        );
    }


    async _loadYearSpecialValues() {
        let toInsert = [];
        for (let sv of specialValues) {
            toInsert.push([
                sv.id,
                sv.id,
                null,
                null,
                null,
            ]);
        }
        await this._insertYear(toInsert);
    }

    async _loadYears(startYear, endYear) {
        console.log(`Loading years between start year: ${startYear} and ${endYear}...`)
        let toInsert = [];
        for (let year = startYear; year < endYear; year++) {
            const year_date = new Date(year, 0, 1);
            toInsert.push([
                year,
                0,
                year_date,
                TimeUtil.daysInYear(year),
                year - 1,
            ]);
        }
        await this._insertYear(toInsert);
        console.log(`Finished loading years.`)
    }

    async _loadQuarterSpecialValues() {
        let toInsert = [];
        for (let sv of specialValues) {
            toInsert.push([
                sv.id,
                sv.id,
                sv.desc,
                null,
                null,
                null,
                null,
                sv.id,
            ]);
        }
        await this._insertQuarter(toInsert);
    }


    async _loadQuarters(startYear, endYear) {
        console.log(`Loading quarters for years between: ${startYear} and ${endYear}.`);
        let toInsert = [];
        for (let year = startYear; year < endYear; year++) {
            let prev_quarter_id = TimeUtil.quarterId(year - 1, 4);
            for (let quarter = 1; quarter <= 4; quarter++) {
                const quarter_id = TimeUtil.quarterId(year, quarter);
                const quarter_date = new Date(year, (quarter - 1) * 3, 1);
                const next_quarter_date = new Date(quarter === 4 ? year + 1 : year, (quarter % 4) * 3, 1);
                toInsert.push([
                    quarter_id,
                    0,
                    `${year} Q${1}`,
                    quarter_date,
                    TimeUtil.dayDiff(next_quarter_date, quarter_date),
                    prev_quarter_id,
                    TimeUtil.quarterId(year - 1, quarter),
                    year
                ]);
                prev_quarter_id = quarter_id;

            }
        }
        await this._insertQuarter(toInsert);
        console.log('Finished loading quarters.');
    }

    async _loadMonthSpecialValues() {
        let toInsert = [];
        for (let sv of specialValues) {
            toInsert.push([
                sv.id,
                sv.id,
                sv.desc,
                null,
                null,
                null,
                null,
                sv.id,
                sv.id,
                sv.id,
            ]);
        }
        await this._insertMonth(toInsert);
    }


    async _loadMonths(startYear, endYear) {
        console.log(`Loading months for years between: ${startYear} and ${endYear}.`);
        let toInsert = [];
        for (let year = startYear; year < endYear; year++) {
            let prev_month_id = TimeUtil.monthId(year - 1, 12);
            for (let month = 1; month <= 12; month++) {
                const month_id = TimeUtil.monthId(year, month);
                const month_date = new Date(year, month - 1, 1);
                const next_month_date = new Date(month === 12 ? year + 1 : year, (month % 12), 1);
                toInsert.push([
                    month_id,
                    0,
                    `${month_date.toLocaleString(this.locale, { month: "short" })} ${year}`,
                    month_date,
                    TimeUtil.dayDiff(next_month_date, month_date),
                    prev_month_id,
                    TimeUtil.monthId(year - 1, month),
                    month,
                    TimeUtil.quarterIdFromDate(month_date),
                    year
                ]);
                prev_month_id = month_id;
            }
        }
        await this._insertMonth(toInsert);
        console.log('Finished loading months.');
    }

    async _loadDaySpecialValues() {
        let toInsert = [];
        for (let sv of specialValues) {
            toInsert.push([
                sv.id,
                sv.id,
                null,
                null,
                null,
                null,
                sv.id,
                sv.id,
                sv.id,

            ]);
        }
        await this._insertDay(toInsert);
    }

    async _loadSpecialValues() {
        console.log('Loading special values...');
        await this._loadYearSpecialValues();
        await this._loadQuarterSpecialValues();
        await this._loadMonthSpecialValues();
        await this._loadDaySpecialValues();
        console.log('Finished loading special values.');
    }
    async _loadDays(startYear, endYear) {
        console.log(`Loading days for years between: ${startYear} and ${endYear}.`);
        let toInsert = [];
        for (let year = startYear; year < endYear; year++) {
            let daysInYear = TimeUtil.daysInYear(year);
            for (let dayOfYear = 1; dayOfYear <= daysInYear; dayOfYear++) {
                const day_date = new Date(year, 0, dayOfYear);
                const day_id = TimeUtil.dayId(day_date);
                toInsert.push([
                    day_id,
                    0,
                    day_date,
                    day_id - 1,
                    TimeUtil.lmDayId(day_date),
                    TimeUtil.lyDayId(day_date),
                    TimeUtil.monthIdFromDate(day_date),
                    TimeUtil.quarterIdFromDate(day_date),
                    year
                ]);

            }
        }
        await this._insertDay(toInsert);
        console.log('Finished loading days.');
    }

    async _loadYtm(startYear, endYear) {
        console.log('Loading year to month...');
        let toInsert = [];
        for (let year = startYear; year < endYear; year++) {
            for (let month = 1; month <= 12; month++) {
                for (let ytm = 1; ytm <= month; ytm++) {
                    toInsert.push([
                        TimeUtil.monthId(year, month),
                        TimeUtil.monthId(year, ytm),
                    ]);
                }
            }
        }
        await this._insertYtm(toInsert);
        console.log('Finished loading year to month...');
    }

}

module.exports = TimeDimensionLoader;