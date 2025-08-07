/**
 * @fileoverview Singleton filing service for global access.
 * This ensures only one filing instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createFiling = require('./index');

class FilingSingleton extends ServiceSingleton {
  constructor() {
    super('Filing');
  }

  /**
   * Initialize the filing singleton with configuration
   * @param {string} type - Filing type ('local', 'git', 's3', 'ftp')
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Filing instance
   */
  initialize(type = 'local', options = {}, eventEmitter = null) {
    return super.initialize(createFiling, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the filing instance
   */
  async readFile(path) {
    return this.getInstance().readFile ? this.getInstance().readFile(path) : null;
  }

  async writeFile(path, content) {
    return this.getInstance().writeFile ? this.getInstance().writeFile(path, content) : false;
  }

  async deleteFile(path) {
    return this.getInstance().deleteFile ? this.getInstance().deleteFile(path) : false;
  }

  async listFiles(path) {
    return this.getInstance().listFiles ? this.getInstance().listFiles(path) : [];
  }

  async exists(path) {
    return this.getInstance().exists ? this.getInstance().exists(path) : false;
  }
}

// Export a single instance
const filingInstance = new FilingSingleton();

module.exports = filingInstance;