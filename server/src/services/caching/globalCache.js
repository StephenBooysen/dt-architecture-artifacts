/**
 * @fileoverview Simple global cache service using Node.js module caching.
 * Node.js caches modules, so this will be a singleton by default.
 */

const createCache = require('./index');

let globalCache = null;
let isInitialized = false;

/**
 * Initialize the global cache instance
 * @param {string} type - Cache type ('memory', 'redis', 'memcached')
 * @param {Object} options - Configuration options  
 * @param {EventEmitter} eventEmitter - Event emitter instance
 * @returns {Cache} The cache instance
 */
function initializeCache(type = 'memory', options = {}, eventEmitter = null) {
  if (isInitialized && globalCache) {
    console.warn('Global cache already initialized');
    return globalCache;
  }

  globalCache = createCache(type, options, eventEmitter);
  isInitialized = true;
  
  console.log(`Global cache initialized with type: ${type}`);
  return globalCache;
}

/**
 * Get the global cache instance
 * @returns {Cache} The cache instance
 * @throws {Error} If cache is not initialized
 */
function getCache() {
  if (!isInitialized || !globalCache) {
    throw new Error('Global cache not initialized. Call initializeCache() first.');
  }
  return globalCache;
}

/**
 * Check if cache is ready
 * @returns {boolean} True if initialized
 */
function isReady() {
  return isInitialized && globalCache !== null;
}

module.exports = {
  initializeCache,
  getCache,
  isReady
};