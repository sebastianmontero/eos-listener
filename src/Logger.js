const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { combine, timestamp, prettyPrint } = winston.format;
const dir = '../logs';
module.exports = {
    logger: winston.createLogger({
        level: 'debug',
        format: combine(
            timestamp(),
            prettyPrint()
        )
    }),
    configure(filePrefix) {
        this.logger.add(
            new DailyRotateFile({
                filename: `${filePrefix}-error.log`,
                dirname: dir,
                maxFiles: '5d',
                level: 'error'
            }));
        this.logger.add(
            new DailyRotateFile({
                filename: `${filePrefix}.log`,
                dirname: dir,
                maxFiles: '2d',
                maxSize: '100m',
                zippedArchive: true
            }));
    },

}