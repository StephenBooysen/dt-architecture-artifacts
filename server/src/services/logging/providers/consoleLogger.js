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
    if (this.eventEmitter_)
      this.eventEmitter_.emit('log:log', { logname: logname, message: logMessage });
  }
}

module.exports = ConsoleLogger;
