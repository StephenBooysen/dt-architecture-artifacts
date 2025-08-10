/**
 * @fileoverview A file logger implementation.
 */

const fs = require('fs');

/**
 * A class that implements a file logger.
 */
class FileLogger {
  /**
   * Initializes the file logger.
   * @param {string} filename The name of the file to log to.
   */
  constructor(options, eventEmitter) {
    /** @private @const {string} */
    this.filename_ = options.filename;
    this.eventEmitter_ = eventEmitter;
  }

  /**
   * Logs a message to a file.
   * @param {string} logname The name of the log.
   * @param {string} message The message to log.
   */
  async log(logname, message) {
    fs.appendFileSync(this.filename_, `${logname}: ${message}\n`);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('log:log', { filename: this.filename_, logname, message });
  }

  /**
   * Logs an error message to a file.
   * @param {string} logname The name of the log.
   * @param {string} message The error message to log.
   */
  async logError(logname, message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.filename_, `${timestamp} - ${logname}: ERROR: ${message}\n`);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('log:error', { filename: this.filename_, logname, message });
  }
}

module.exports = FileLogger;
