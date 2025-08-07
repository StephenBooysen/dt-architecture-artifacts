/**
 * @fileoverview Singleton logging service for global access.
 * This ensures only one logging instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createLogger = require('./index');

class LoggingSingleton extends ServiceSingleton {
  constructor() {
    super('Logging');
  }

  /**
   * Initialize the logging singleton with configuration
   * @param {string} type - Logger type ('console', 'file')
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Logger instance
   */
  initialize(type = 'console', options = {}, eventEmitter = null) {
    return super.initialize(createLogger, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the logger instance
   */
  info(message, meta = {}) {
    const logger = this.getInstance();
    if (logger.info) {
      return logger.info(message, meta);
    }
    console.log(`[INFO] ${message}`, meta);
  }

  error(message, meta = {}) {
    const logger = this.getInstance();
    if (logger.error) {
      return logger.error(message, meta);
    }
    console.error(`[ERROR] ${message}`, meta);
  }

  warn(message, meta = {}) {
    const logger = this.getInstance();
    if (logger.warn) {
      return logger.warn(message, meta);
    }
    console.warn(`[WARN] ${message}`, meta);
  }

  debug(message, meta = {}) {
    const logger = this.getInstance();
    if (logger.debug) {
      return logger.debug(message, meta);
    }
    console.debug(`[DEBUG] ${message}`, meta);
  }

  log(level, message, meta = {}) {
    const logger = this.getInstance();
    if (logger.log) {
      return logger.log(level, message, meta);
    }
    console.log(`[${level.toUpperCase()}] ${message}`, meta);
  }
}

// Export a single instance
const loggingInstance = new LoggingSingleton();

module.exports = loggingInstance;