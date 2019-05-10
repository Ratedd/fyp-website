const { createLogger, transports, format } = require('winston');
const { DailyRotateFile } = require('winston-daily-rotate-file');

const logger = createLogger({
	format: format.combine(
		format.colorize({ level: true }),
		format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
		format.printf(info => {
			const { timestamp, level, message, ...rest } = info;
			return `[${timestamp}] ${level}: ${message}${Object.keys(rest).length ? `\n${JSON.stringify(rest, null, 2)}` : ''}`;
		})
	),
	transports: [
		transports.Console({ level: 'info' }),
		new DailyRotateFile({
			format: format.combine(
				format.timestamp(),
				format.json()
			),
			level: 'debug',
			datePattern: 'DD-MM-YYYY',
			filename: 'website-%DATE%.log',
			maxFiles: '14d'
		})
	]
});

module.exports = logger;
