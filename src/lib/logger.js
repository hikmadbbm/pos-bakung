const LEVELS = ['error', 'warn', 'info', 'debug'];
const level = process.env.LOG_LEVEL || 'info';
const shouldLog = (l) => LEVELS.indexOf(l) <= LEVELS.indexOf(level);

export const logger = {
  info(message, meta = {}) {
    if (shouldLog('info')) console.log(JSON.stringify({ level: 'info', message, ...meta }));
  },
  warn(message, meta = {}) {
    if (shouldLog('warn')) console.warn(JSON.stringify({ level: 'warn', message, ...meta }));
  },
  error(message, meta = {}) {
    if (shouldLog('error')) console.error(JSON.stringify({ level: 'error', message, ...meta }));
  },
  debug(message, meta = {}) {
    if (shouldLog('debug')) console.log(JSON.stringify({ level: 'debug', message, ...meta }));
  },
};
