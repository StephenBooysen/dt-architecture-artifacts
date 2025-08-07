/**
 * @fileoverview Singleton cache service for global access.
 * This ensures only one cache instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createCache = require('./index');

class CacheSingleton extends ServiceSingleton {
  constructor() {
    super('Cache');
  }

  /**
   * Initialize the cache singleton with configuration
   * @param {string} type - Cache type ('memory', 'redis', 'memcached')
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {Cache|CacheRedis|CacheMemcached} Cache instance
   */
  initialize(type = 'memory', options = {}, eventEmitter = null) {
    return super.initialize(createCache, type, options, eventEmitter);
  }


  /**
   * Convenience methods that delegate to the cache instance
   */
  async get(key) {
    return this.getInstance().get(key);
  }

  async put(key, value) {
    return this.getInstance().put(key, value);
  }

  async delete(key) {
    return this.getInstance().delete(key);
  }
}

// Export a single instance
const cacheInstance = new CacheSingleton();

module.exports = cacheInstance;