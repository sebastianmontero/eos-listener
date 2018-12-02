const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { combine, timestamp, prettyPrint } = winston.format;
const dir = '../logs';
module.exports = winston.createLogger({
    level: 'debug',
    format: combine(
        timestamp(),
        prettyPrint()
    ),
    transports: [
        new winston.transports.Console({ level: 'info' }),
        new DailyRotateFile({
            filename: 'error.log',
            dirname: dir,
            maxFiles: '5d',
            level: 'error'
        }),
        new DailyRotateFile({
            filename: 'log.log',
            dirname: dir,
            maxFiles: '2d',
            maxSize: '100m',
            zippedArchive: true
        })
    ]
});