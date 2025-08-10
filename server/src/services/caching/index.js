/**
 * @fileoverview Factory for creating cache instances.
 * 
 * This module provides a factory function for creating different types of cache
 * instances including in-memory, Redis, and Memcached implementations. It also
 * initializes the associated routes for each cache type.
 * 
 * Methods:
 * - createCache(type, options, eventEmitter): Creates cache instance based on type
 */

const Cache = require('./providers/caching');
const CacheRedis = require('./providers/cachingRedis');
const CacheMemcached = require('./providers/cachingMemcached');
const Routes = require('./routes');

/**
 * Creates a cache instance based on the provided type.
 * 
 * This factory function instantiates the appropriate cache provider based on the
 * specified type (memory, redis, or memcached), initializes the associated routes,
 * and returns the configured cache instance. It also emits events for
 * service lifecycle tracking.
 * 
 * @param {string} type - The type of cache to create ('memory', 'redis', 'memcached')
 * @param {Object} options - Connection options for Redis/Memcached or config for memory cache
 * @param {EventEmitter} eventEmitter - Event emitter for service communication
 * @returns {Cache|CacheRedis|CacheMemcached} Configured cache instance
 * @emits {string} 'Cache Service Intantiated' - When cache service is created
 */
function createCache(type, options, eventEmitter) {
  eventEmitter.emit('Cache Service Intantiated', {});
  let cache;
  if (type === 'redis') {
    cache = new CacheRedis(options, eventEmitter);
  } else if (type === 'memcached') {
    cache = new CacheMemcached(options, eventEmitter);
  } else {
    cache = new Cache(options, eventEmitter);
  }
  Routes(options, eventEmitter, cache);
  return cache;
}

module.exports = createCache;
