/**
 * @fileoverview A simple in-memory cache implementation.
 */

/**
 * A class that implements a simple in-memory cache.
 */
class Cache {
  /**
   * Initializes the cache.
   */
  constructor(options, eventEmitter) {
    /** @private @const {!Object<string, *>} */
    this.cache_ = {};
    this.eventEmitter_ = eventEmitter;
    
    /** @private @const {!Map<string, Object>} */
    this.keyStats_ = new Map();
  }

  /**
   * Adds a value to the cache.
   * @param {string} key The key to store the value under.
   * @param {*} value The value to store.
   */
  async put(key, value) {
    this.cache_[key] = value;
    this._updateKeyStats(key, 'put');
    if (this.eventEmitter_)
      this.eventEmitter_.emit('cache:put', { key, value });
  }

  /**
   * Retrieves a value from the cache.
   * @param {string} key The key to retrieve the value for.
   * @return {*} The cached value, or undefined if the key is not found.
   */
  async get(key) {
    const value = this.cache_[key];
    if (value !== undefined) {
      this._updateKeyStats(key, 'get');
    }
    if (this.eventEmitter_)
      this.eventEmitter_.emit('cache:get', { key, value });
    return value;
  }

  /**
   * Deletes a value from the cache.
   * @param {string} key The key to delete.
   */
  async delete(key) {
    delete this.cache_[key];
    this.keyStats_.delete(key);
    if (this.eventEmitter_) this.eventEmitter_.emit('cache:delete', { key });
  }

  /**
   * Updates statistics for a cache key operation.
   * @param {string} key The cache key.
   * @param {string} operation The operation type ('put' or 'get').
   * @private
   */
  _updateKeyStats(key, operation) {
    const now = Date.now();
    let stats = this.keyStats_.get(key);
    
    if (!stats) {
      stats = {
        cachekey: key,
        hits: 0,
        lastAccess: now,
        created: now
      };
      this.keyStats_.set(key, stats);
    }
    
    if (operation === 'get') {
      stats.hits++;
    }
    stats.lastAccess = now;
    
    // Keep only top 100 entries by removing least recently accessed
    if (this.keyStats_.size > 100) {
      let oldestKey = null;
      let oldestTime = Infinity;
      
      for (const [k, v] of this.keyStats_) {
        if (v.lastAccess < oldestTime) {
          oldestTime = v.lastAccess;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.keyStats_.delete(oldestKey);
      }
    }
  }

  /**
   * Gets the top cache key statistics ordered by latest access.
   * @return {Array<Object>} Array of cache key statistics.
   */
  getKeyStats() {
    const stats = Array.from(this.keyStats_.values());
    return stats.sort((a, b) => b.lastAccess - a.lastAccess);
  }
}

module.exports = Cache;
