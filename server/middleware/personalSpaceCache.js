/**
 * @fileoverview Personal space cache-first middleware
 * Provides cache-first access to personal space data
 */

const path = require('path');

// Cache instance will be retrieved from DI container
let cacheInstance = null;

/**
 * Initialize cache instance from service container
 * @param {Object} serviceContainer - The DI service container
 */
function initializeCache(serviceContainer) {
  if (!cacheInstance && serviceContainer && serviceContainer.has('cache')) {
    try {
      cacheInstance = serviceContainer.get('cache');
      console.log('PersonalSpaceCache: Cache service initialized from DI container');
    } catch (error) {
      console.warn('PersonalSpaceCache: Failed to get cache from DI container:', error.message);
    }
  }
}

/**
 * Get cache instance, attempting to initialize if needed
 * @param {Object} req - Express request object (contains app.locals.serviceContainer)
 * @returns {Object|null} Cache instance or null if not available
 */
function getCacheInstance(req) {
  if (!cacheInstance && req && req.app && req.app.locals && req.app.locals.serviceContainer) {
    initializeCache(req.app.locals.serviceContainer);
  }
  return cacheInstance;
}

/**
 * Get a cache value
 * @param {string} key 
 * @param {object} req 
 * @returns 
 */
async function getCacheValue(key, req = null) {
  try {
    const cache = req ? getCacheInstance(req) : cacheInstance;
    if (!cache) {
      console.warn(`Cache not available for key ${key}`);
      return null;
    }
    const value = await cache.get(key);
    return value || null;
  } catch (error) {
    console.warn(`Error accessing cache for key ${key}:`, error.message);
    return null;
  }
}

/**
 * Set a cache value
 * @param {string} key 
 * @param {string} value 
 * @param {object} req 
 * @param {int} ttl 
 * @returns 
 */
async function setCacheValue(key, value, req = null, ttl = 3600) {
  try {
    const cache = req ? getCacheInstance(req) : cacheInstance;
    if (!cache) {
      console.warn(`Cache not available for key ${key}`);
      return;
    }
    await cache.put(key, value);
  } catch (error) {
    console.warn(`Error caching key ${key}:`, error.message);
  }
}

/**
 * Generate cache keys for personal space data
 * @param {string} username 
 * @param {string} filePath 
 * @param {string} operation 
 * @returns 
 */
function generateCacheKeys(username, filePath = '', operation = 'content') {
  const base = `personal:${username}`;
  
  switch (operation) {
    case 'content':
      return `${base}:content:${filePath}`;
    case 'metadata':
      return `${base}:meta:${filePath}`;
    case 'tree':
      return `${base}:tree`;
    case 'list':
      return `${base}:list:${path.dirname(filePath) || ''}`;
    case 'templates':
      return `${base}:templates`;
    default:
      return `${base}:${operation}:${filePath}`;
  }
}

/**
 * Cache-first file content middleware
 */
function cacheFirstContent() {
  return async (req, res, next) => {
    // Only apply to Personal space GET requests
    if (req.method !== 'GET' || req.params.space !== 'Personal') {
      return next();
    }
    
    const username = req.user?.username;
    if (!username) {
      return next();
    }
    
    // Extract file path from request
    const filePath = req.params[0] || req.query.path || '';
    if (!filePath) {
      return next(); // Let regular handler deal with directory listing
    }
    
    try {
      // Try cache first
      const cacheKey = generateCacheKeys(username, filePath, 'content');
      const cachedContent = await getCacheValue(cacheKey, req);
      
      if (cachedContent) {
        console.log(`Cache hit for: ${username}:${filePath}`);
        
        // Also get cached metadata if available
        const metaCacheKey = generateCacheKeys(username, filePath, 'metadata');
        const cachedMeta = await getCacheValue(metaCacheKey, req);
        
        // Format response similar to file route
        const response = {
          content: cachedContent.raw || cachedContent,
          path: filePath,
          fileType: cachedMeta?.type || 'unknown',
          fromCache: true
        };
        
        // Add additional fields for markdown files
        if (cachedContent.type === 'markdown') {
          response.cleanContent = cachedContent.clean;
          response.hasComments = false; // Would need to be stored in cache
        }
        
        if (cachedMeta) {
          response.size = cachedMeta.size;
          response.mtime = cachedMeta.mtime;
          response.lastCached = cachedMeta.processedAt;
        }
        
        return res.json(response);
      }
      
      console.log(`Cache miss for: ${username}:${filePath}`);
      
      // Continue to file system access
      // Store original end method to intercept response
      const originalSend = res.json;
      res.json = function(data) {
        // Cache the response data for next time (async, don't wait)
        if (data && data.content && !data.error) {
          const cacheKey = generateCacheKeys(username, filePath, 'content');
          const metaCacheKey = generateCacheKeys(username, filePath, 'metadata');
          
          // Cache content
          setCacheValue(cacheKey, data.content, req).catch(console.warn);
          
          // Cache metadata
          const metadata = {
            type: data.fileType,
            size: data.size,
            mtime: data.mtime,
            processedAt: new Date().toISOString()
          };
          setCacheValue(metaCacheKey, metadata, req).catch(console.warn);
        }
        
        // Call original method
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error in cache-first content middleware:', error);
      next();
    }
  };
}

/**
 * Cache-first directory tree middleware
 */
function cacheFirstTree() {
  return async (req, res, next) => {
    // Apply to all spaces for GET /files requests
    if (req.method !== 'GET' || !req.path.endsWith('/files')) {
      return next();
    }
    
    const spaceName = req.params.space;
    const username = req.user?.username;
    
    // Generate appropriate cache key
    let cacheKey;
    if (spaceName === 'Personal' && username) {
      cacheKey = generateCacheKeys(username, '', 'tree');
    } else {
      cacheKey = `space:${spaceName}:tree`;
    }
    
    try {
      // Try cache first
      const cachedData = await getCacheValue(cacheKey, req);
      
      if (cachedData) {
        console.log(`Tree cache hit for space: ${spaceName}`);
        
        // Return the tree from cached data
        if (cachedData.tree && Array.isArray(cachedData.tree)) {
          return res.json(cachedData.tree);
        } else if (Array.isArray(cachedData)) {
          return res.json(cachedData);
        } else {
          return res.json({
            ...cachedData,
            fromCache: true
          });
        }
      }
      
      console.log(`Tree cache miss for space: ${spaceName}`);
      
      // Store original send method to intercept response (for Personal space)
      if (spaceName === 'Personal') {
        const originalSend = res.json;
        res.json = function(data) {
          // Cache the tree data (async, don't wait)
          if (Array.isArray(data)) {
            const cacheData = {
              tree: data,
              cachedAt: new Date().toISOString()
            };
            setCacheValue(cacheKey, cacheData, req).catch(console.warn);
          }
          
          // Call original method
          originalSend.call(this, data);
        };
      }
      
      next();
    } catch (error) {
      console.error('Error in cache-first tree middleware:', error);
      next();
    }
  };
}

/**
 * Cache-first templates middleware
 */
function cacheFirstTemplates() {
  return async (req, res, next) => {
    // Only apply to Personal space template requests
    if (req.method !== 'GET' || req.params.space !== 'Personal') {
      return next();
    }
    
    const username = req.user?.username;
    if (!username) {
      return next();
    }
    
    // Only for /templates endpoint
    if (!req.path.endsWith('/templates')) {
      return next();
    }
    
    try {
      // Try cache first
      const cacheKey = generateCacheKeys(username, '', 'templates');
      const cachedTemplates = await getCacheValue(cacheKey, req);
      
      if (cachedTemplates) {
        console.log(`Templates cache hit for user: ${username}`);
        return res.json({
          ...cachedTemplates,
          fromCache: true
        });
      }
      
      console.log(`Templates cache miss for user: ${username}`);
      
      // Store original end method to intercept response
      const originalSend = res.json;
      res.json = function(data) {
        // Cache the templates data (async, don't wait)
        if (Array.isArray(data)) {
          const cacheKey = generateCacheKeys(username, '', 'templates');
          const cacheData = {
            templates: data,
            cachedAt: new Date().toISOString()
          };
          setCacheValue(cacheKey, cacheData, req).catch(console.warn);
        }
        
        // Call original method
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error in cache-first templates middleware:', error);
      next();
    }
  };
}

/**
 * Cache invalidation for write operations
 */
function invalidateCacheOnWrite() {
  return async (req, res, next) => {
    // Only apply to Personal space write operations
    if (!['POST', 'PUT', 'DELETE'].includes(req.method) || req.params.space !== 'Personal') {
      return next();
    }
    
    const username = req.user?.username;
    if (!username) {
      return next();
    }
    
    // Store original end method to invalidate cache after write
    const originalSend = res.json;
    res.json = function(data) {
      // Invalidate relevant caches after successful write (async, don't wait)
      if (res.statusCode < 400) {
        const filePath = req.params[0] || '';
        
        // Invalidate tree cache (always)
        const treeCacheKey = generateCacheKeys(username, '', 'tree');
        deleteCacheValue(treeCacheKey, req).catch(console.warn);
        
        // Invalidate content cache for specific file
        if (filePath) {
          const contentCacheKey = generateCacheKeys(username, filePath, 'content');
          const metaCacheKey = generateCacheKeys(username, filePath, 'metadata');
          deleteCacheValue(contentCacheKey, req).catch(console.warn);
          deleteCacheValue(metaCacheKey, req).catch(console.warn);
        }
        
        // Invalidate templates cache if template operation
        if (req.path.includes('/templates')) {
          const templatesCacheKey = generateCacheKeys(username, '', 'templates');
          deleteCacheValue(templatesCacheKey, req).catch(console.warn);
        }
        
        console.log(`Invalidated cache for write operation: ${username}:${filePath}`);
      }
      
      // Call original method
      originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Delete a cache key
 * @param {string} key 
 * @param {*} req 
 * @returns 
 */
async function deleteCacheValue(key, req = null) {
  try {
    const cache = req ? getCacheInstance(req) : cacheInstance;
    if (!cache) {
      console.warn(`Cache not available for deleting key ${key}`);
      return;
    }
    await cache.delete(key);
  } catch (error) {
    console.warn(`Error deleting cache key ${key}:`, error.message);
  }
}

module.exports = {
  cacheFirstContent,
  cacheFirstTree,
  cacheFirstTemplates,
  invalidateCacheOnWrite,
  generateCacheKeys,
  initializeCache
};