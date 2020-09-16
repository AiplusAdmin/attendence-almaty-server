const winston = require('winston');
// creates a new Winston Logger
var options = {
	file: {
	  level: 'error',
	  filename: './logs/error.log',
	  handleExceptions: true,
	  json: true,
	  maxsize: 5242880, // 5MB
	  maxFiles: 5,
	  colorize: true,
	  timestamp: true
	},
	console: {
	  level: 'debug',
	  handleExceptions: true,
	  json: false,
	  colorize: true,
	},
};

const logger = new winston.createLogger({
  level: 'info',
  format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
	),
  transports: [
	new winston.transports.File(options.file)
  ],
  exitOnError: false
});

logger.stream = {
	write: function(message, encoding) {
	  // use the 'info' log level so the output will be picked up by both transports (file and console)
	  logger.error(message);
	},
};
module.exports = logger;