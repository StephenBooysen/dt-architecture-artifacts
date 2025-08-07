/**
 * @fileoverview Singleton dataserve service for global access.
 * This ensures only one dataserve instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createDataserve = require('./index');

class DataserveSingleton extends ServiceSingleton {
  constructor() {
    super('Dataserve');
  }

  /**
   * Initialize the dataserve singleton with configuration
   * @param {string} type - Dataserve type
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Dataserve instance
   */
  initialize(type = '', options = {}, eventEmitter = null) {
    return super.initialize(createDataserve, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the dataserve instance
   */
  async serve(data) {
    return this.getInstance().serve ? this.getInstance().serve(data) : data;
  }

  async get(key) {
    return this.getInstance().get ? this.getInstance().get(key) : null;
  }

  async set(key, value) {
    return this.getInstance().set ? this.getInstance().set(key, value) : false;
  }
}

// Export a single instance
const dataserveInstance = new DataserveSingleton();

module.exports = dataserveInstance;