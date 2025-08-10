/**
 * @fileoverview A console logger implementation.
 */

const os = require('os');

/**
 * A class that implements a console logger.
 */
class ConsoleLogger {
  constructor(options, eventEmitter) {
    this.eventEmitter_ = eventEmitter;
    this.logs_ = []; // In-memory storage for logs
    this.maxLogs_ = 1000; // Maximum number of logs to store
  }

  /**
   * Logs a message to the console.
   * @param {string} logname The name of the log.
   * @param {string} message The message to log.
   */
  async log(logname, message) {
    const timestamp = new Date().toISOString();
    const device = os.hostname();
    const logMessage = `${timestamp} - ${device} - ${logname} - ${message}`;
    console.log(logMessage);
    
    // Store in memory
    this.storeLog_(logname, message, timestamp, 'info');
    
    if (this.eventEmitter_)
      this.eventEmitter_.emit('log:log', { logname: logname, message: logMessage });
  }

  /**
   * Logs an error message to the console.
   * @param {string} logname The name of the log.
   * @param {string} message The error message to log.
   */
  async logError(logname, message) {
    const timestamp = new Date().toISOString();
    const device = os.hostname();
    const logMessage = `${timestamp} - ${device} - ${logname} - ERROR: ${message}`;
    console.error(logMessage);
    
    // Store in memory
    this.storeLog_(logname, message, timestamp, 'error');
    
    if (this.eventEmitter_)
      this.eventEmitter_.emit('log:error', { logname: logname, message: logMessage });
  }

  /**
   * Stores a log entry in memory.
   * @param {string} logname The name of the log.
   * @param {string} message The message to store.
   * @param {string} timestamp The timestamp of the log.
   * @param {string} type The type of log (info, error).
   * @private
   */
  storeLog_(logname, message, timestamp, type) {
    const logEntry = {
      name: logname,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      date: timestamp,
      type: type
    };
    
    // Add to beginning of array (newest first)
    this.logs_.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs_.length > this.maxLogs_) {
      this.logs_ = this.logs_.slice(0, this.maxLogs_);
    }
  }

  /**
   * Retrieves stored log entries.
   * @param {number} limit Optional limit for number of logs to return.
   * @return {Array} Array of log entries, newest first.
   */
  getLogs(limit = null) {
    if (limit && typeof limit === 'number' && limit > 0) {
      return this.logs_.slice(0, limit);
    }
    return [...this.logs_]; // Return a copy to prevent external modification
  }

  /**
   * Clears all stored log entries.
   */
  clearLogs() {
    this.logs_ = [];
  }
}

module.exports = ConsoleLogger;
