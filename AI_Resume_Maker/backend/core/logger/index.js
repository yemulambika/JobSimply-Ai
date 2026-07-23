/**
 * Structured Logger
 * Provides consistent logging across the application
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function formatMessage(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
    env: process.env.NODE_ENV,
    service: 'ai-resume-maker',
  });
}

function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

export const logger = {
  error(message, meta = {}) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, meta));
    }
  },

  warn(message, meta = {}) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, meta));
    }
  },

  info(message, meta = {}) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, meta));
    }
  },

  http(message, meta = {}) {
    if (shouldLog('http')) {
      console.log(formatMessage('http', message, meta));
    }
  },

  debug(message, meta = {}) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, meta));
    }
  },

  /**
   * Log request middleware helper
   */
  logRequest(req) {
    this.http('HTTP Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  },

  /**
   * Log database query
   */
  logQuery(sql, duration) {
    this.debug('Database Query', {
      query: sql.substring(0, 200),
      duration: `${duration}ms`,
    });
  },

  /**
   * Log authentication event
   */
  logAuth(userId, action, success = true) {
    this.info('Authentication Event', {
      userId,
      action,
      success,
    });
  },

  /**
   * Log business event
   */
  logBusiness(entity, action, userId = null, metadata = {}) {
    this.info('Business Event', {
      entity,
      action,
      userId,
      ...metadata,
    });
  },
};

export default logger;
