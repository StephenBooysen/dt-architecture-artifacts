/**
 * @fileoverview Personal space cache-first middleware
 * Provides cache-first access to personal space data
 */

const path = require('path');
const axios = require('axios');

// Cache service endpoint
const CACHE_BASE_URL = 'http://localhost:3001/api/caching';

/**
 * Cache service helpers
 */
async function getCacheValue(key) {
  try {
    const response = await axios.get(`${CACHE_BASE_URL}/get/${encodeURIComponent(key)}`);
    
    if (response.status === 200 && response.data) {
      return response.data;
    } else {
      return null;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Cache miss
    }
    console.warn(`Error accessing cache for key ${key}:`, error.message);
    return null;
  }
}

async function setCacheValue(key, value, ttl = 3600) {
  try {
    const response = await axios.post(`${CACHE_BASE_URL}/put/${encodeURIComponent(key)}`, value, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      console.warn(`Failed to cache key ${key}:`, response.statusText);
    }
  } catch (error) {
    console.warn(`Error caching key ${key}:`, error.message);
  }
}

/**
 * Generate cache keys for personal space data
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
      const cachedContent = await getCacheValue(cacheKey);
      
      if (cachedContent) {
        console.log(`Cache hit for: ${username}:${filePath}`);
        
        // Also get cached metadata if available
        const metaCacheKey = generateCacheKeys(username, filePath, 'metadata');
        const cachedMeta = await getCacheValue(metaCacheKey);
        
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
          setCacheValue(cacheKey, data.content).catch(console.warn);
          
          // Cache metadata
          const metadata = {
            type: data.fileType,
            size: data.size,
            mtime: data.mtime,
            processedAt: new Date().toISOString()
          };
          setCacheValue(metaCacheKey, metadata).catch(console.warn);
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
    // Only apply to Personal space file tree requests
    if (req.method !== 'GET' || req.params.space !== 'Personal') {
      return next();
    }
    
    const username = req.user?.username;
    if (!username) {
      return next();
    }
    
    // Only for /files endpoint (directory tree)
    if (!req.path.endsWith('/files')) {
      return next();
    }
    
    try {
      // Try cache first
      const cacheKey = generateCacheKeys(username, '', 'tree');
      const cachedTree = await getCacheValue(cacheKey);
      
      if (cachedTree) {
        console.log(`Tree cache hit for user: ${username}`);
        return res.json({
          ...cachedTree,
          fromCache: true,
          cachedAt: cachedTree.cachedAt
        });
      }
      
      console.log(`Tree cache miss for user: ${username}`);
      
      // Store original end method to intercept response
      const originalSend = res.json;
      res.json = function(data) {
        // Cache the tree data (async, don't wait)
        if (Array.isArray(data)) {
          const cacheKey = generateCacheKeys(username, '', 'tree');
          const cacheData = {
            tree: data,
            cachedAt: new Date().toISOString()
          };
          setCacheValue(cacheKey, cacheData).catch(console.warn);
        }
        
        // Call original method
        originalSend.call(this, data);
      };
      
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
      const cachedTemplates = await getCacheValue(cacheKey);
      
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
          setCacheValue(cacheKey, cacheData).catch(console.warn);
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
        deleteCacheValue(treeCacheKey).catch(console.warn);
        
        // Invalidate content cache for specific file
        if (filePath) {
          const contentCacheKey = generateCacheKeys(username, filePath, 'content');
          const metaCacheKey = generateCacheKeys(username, filePath, 'metadata');
          deleteCacheValue(contentCacheKey).catch(console.warn);
          deleteCacheValue(metaCacheKey).catch(console.warn);
        }
        
        // Invalidate templates cache if template operation
        if (req.path.includes('/templates')) {
          const templatesCacheKey = generateCacheKeys(username, '', 'templates');
          deleteCacheValue(templatesCacheKey).catch(console.warn);
        }
        
        console.log(`Invalidated cache for write operation: ${username}:${filePath}`);
      }
      
      // Call original method
      originalSend.call(this, data);
    };
    
    next();
  };
}

async function deleteCacheValue(key) {
  try {
    const response = await axios.delete(`${CACHE_BASE_URL}/delete/${encodeURIComponent(key)}`);
    
    if (response.status !== 200) {
      console.warn(`Failed to delete cache key ${key}:`, response.statusText);
    }
  } catch (error) {
    if (error.response?.status !== 404) {
      console.warn(`Error deleting cache key ${key}:`, error.message);
    }
  }
}

module.exports = {
  cacheFirstContent,
  cacheFirstTree,
  cacheFirstTemplates,
  invalidateCacheOnWrite,
  generateCacheKeys
};