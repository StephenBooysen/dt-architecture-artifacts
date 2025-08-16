/**
 * @fileoverview Git space cache-first middleware
 * Provides cache-first access to git space data (Shared/Knowledge spaces)
 */

const path = require('path');
const axios = require('axios');

// Cache service endpoint
const CACHE_BASE_URL = 'http://localhost:3001/api/caching';

/**
 * Get a cache value
 * @param {string} key 
 * @returns 
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

/**
 * Set a cache value
 * @param {string} key 
 * @param {string} value 
 * @param {int} ttl 
 */
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
 * Delete a cache value
 * @param {string} key 
 */
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

/**
 * Generate cache keys for git space data
 * @param {string} spaceName 
 * @param {string} filePath 
 * @param {string} operation 
 * @returns 
 */
function generateGitCacheKeys(spaceName, filePath = '', operation = 'content') {
  const base = `git:${spaceName.toLowerCase()}`;
  
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
 * Check if request is for a git space
 */
function isGitSpace(spaceName) {
  return spaceName && ['Shared', 'Knowledge'].includes(spaceName);
}

/**
 * Cache-first file content middleware for git spaces
 */
function gitCacheFirstContent() {
  return async (req, res, next) => {
    // Only apply to git space GET requests
    if (req.method !== 'GET' || !isGitSpace(req.params.space)) {
      return next();
    }
    
    const spaceName = req.params.space;
    
    // Extract file path from request
    const filePath = req.params[0] || req.query.path || '';
    if (!filePath) {
      return next(); // Let regular handler deal with directory listing
    }
    
    try {
      // Try cache first
      const cacheKey = generateGitCacheKeys(spaceName, filePath, 'content');
      const cachedContent = await getCacheValue(cacheKey);
      
      if (cachedContent) {
        console.log(`Git cache hit for: ${spaceName}:${filePath}`);
        
        // Also get cached metadata if available
        const metaCacheKey = generateGitCacheKeys(spaceName, filePath, 'metadata');
        const cachedMeta = await getCacheValue(metaCacheKey);
        
        // Format response similar to file route
        const response = {
          content: cachedContent.raw || cachedContent,
          path: filePath,
          fileType: cachedMeta?.type || 'unknown',
          fromCache: true,
          space: spaceName
        };
        
        // Add additional fields for markdown files
        if (cachedContent.type === 'markdown') {
          response.cleanContent = cachedContent.clean;
          response.comments = cachedContent.comments || [];
          response.hasComments = (cachedContent.comments || []).length > 0;
        }
        
        if (cachedMeta) {
          response.size = cachedMeta.size;
          response.mtime = cachedMeta.mtime;
          response.lastCached = cachedMeta.processedAt;
        }
        
        return res.json(response);
      }
      
      console.log(`Git cache miss for: ${spaceName}:${filePath}`);
      
      // Continue to file system access
      // Store original end method to intercept response
      const originalSend = res.json;
      res.json = function(data) {
        // Cache the response data for next time (async, don't wait)
        if (data && data.content && !data.error) {
          const cacheKey = generateGitCacheKeys(spaceName, filePath, 'content');
          const metaCacheKey = generateGitCacheKeys(spaceName, filePath, 'metadata');
          
          // Prepare content for caching
          let cacheContent = data.content;
          if (data.fileType === 'markdown') {
            cacheContent = {
              raw: data.content,
              clean: data.cleanContent,
              comments: data.comments,
              type: 'markdown'
            };
          }
          
          // Cache content
          setCacheValue(cacheKey, cacheContent).catch(console.warn);
          
          // Cache metadata
          const metadata = {
            type: data.fileType,
            size: data.size,
            mtime: data.mtime,
            processedAt: new Date().toISOString(),
            space: spaceName
          };
          setCacheValue(metaCacheKey, metadata).catch(console.warn);
        }
        
        // Call original method
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error in git cache-first content middleware:', error);
      next();
    }
  };
}

/**
 * Cache-first directory tree middleware for git spaces
 */
function gitCacheFirstTree() {
  return async (req, res, next) => {
    // Only apply to git space file tree requests
    if (req.method !== 'GET' || !isGitSpace(req.params.space)) {
      return next();
    }
    
    const spaceName = req.params.space;
    
    // Only for /files endpoint (directory tree)
    if (!req.path.endsWith('/files')) {
      return next();
    }
    
    try {
      // Try cache first
      const cacheKey = generateGitCacheKeys(spaceName, '', 'tree');
      const cachedTree = await getCacheValue(cacheKey);
      
      if (cachedTree) {
        console.log(`Git tree cache hit for space: ${spaceName}`);
        return res.json({
          ...cachedTree,
          fromCache: true,
          cachedAt: cachedTree.cachedAt,
          space: spaceName
        });
      }
      
      console.log(`Git tree cache miss for space: ${spaceName}`);
      
      // Store original end method to intercept response
      const originalSend = res.json;
      res.json = function(data) {
        // Cache the tree data (async, don't wait)
        if (Array.isArray(data)) {
          const cacheKey = generateGitCacheKeys(spaceName, '', 'tree');
          const cacheData = {
            tree: data,
            cachedAt: new Date().toISOString(),
            space: spaceName
          };
          setCacheValue(cacheKey, cacheData).catch(console.warn);
        }
        
        // Call original method
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error in git cache-first tree middleware:', error);
      next();
    }
  };
}

/**
 * Cache-first templates middleware for git spaces
 */
function gitCacheFirstTemplates() {
  return async (req, res, next) => {
    // Only apply to writable git space template requests (readonly spaces don't have templates)
    if (req.method !== 'GET' || !isGitSpace(req.params.space) || req.params.space === 'Knowledge') {
      return next();
    }
    
    const spaceName = req.params.space;
    
    // Only for /templates endpoint
    if (!req.path.endsWith('/templates')) {
      return next();
    }
    
    try {
      // Try cache first
      const cacheKey = generateGitCacheKeys(spaceName, '', 'templates');
      const cachedTemplates = await getCacheValue(cacheKey);
      
      if (cachedTemplates) {
        console.log(`Git templates cache hit for space: ${spaceName}`);
        return res.json({
          ...cachedTemplates,
          fromCache: true,
          space: spaceName
        });
      }
      
      console.log(`Git templates cache miss for space: ${spaceName}`);
      
      // Store original end method to intercept response
      const originalSend = res.json;
      res.json = function(data) {
        // Cache the templates data (async, don't wait)
        if (Array.isArray(data)) {
          const cacheKey = generateGitCacheKeys(spaceName, '', 'templates');
          const cacheData = {
            templates: data,
            cachedAt: new Date().toISOString(),
            space: spaceName
          };
          setCacheValue(cacheKey, cacheData).catch(console.warn);
        }
        
        // Call original method
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error in git cache-first templates middleware:', error);
      next();
    }
  };
}

/**
 * Cache invalidation for git space write operations
 */
function gitInvalidateCacheOnWrite() {
  return async (req, res, next) => {
    // Only apply to git space write operations (exclude readonly Knowledge space)
    if (!['POST', 'PUT', 'DELETE'].includes(req.method) || 
        !isGitSpace(req.params.space) || 
        req.params.space === 'Knowledge') {
      return next();
    }
    
    const spaceName = req.params.space;
    
    // Store original end method to invalidate cache after write
    const originalSend = res.json;
    res.json = function(data) {
      // Invalidate relevant caches after successful write (async, don't wait)
      if (res.statusCode < 400) {
        const filePath = req.params[0] || '';
        
        // Invalidate tree cache (always)
        const treeCacheKey = generateGitCacheKeys(spaceName, '', 'tree');
        deleteCacheValue(treeCacheKey).catch(console.warn);
        
        // Invalidate content cache for specific file
        if (filePath) {
          const contentCacheKey = generateGitCacheKeys(spaceName, filePath, 'content');
          const metaCacheKey = generateGitCacheKeys(spaceName, filePath, 'metadata');
          deleteCacheValue(contentCacheKey).catch(console.warn);
          deleteCacheValue(metaCacheKey).catch(console.warn);
        }
        
        // Invalidate templates cache if template operation
        if (req.path.includes('/templates')) {
          const templatesCacheKey = generateGitCacheKeys(spaceName, '', 'templates');
          deleteCacheValue(templatesCacheKey).catch(console.warn);
        }
        
        console.log(`Invalidated git cache for write operation: ${spaceName}:${filePath}`);
      }
      
      // Call original method
      originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Combined cache middleware that works for both personal and git spaces
 */
function universalCacheFirstContent() {
  return async (req, res, next) => {
    if (req.params.space === 'Personal') {
      // Use personal space cache logic
      const { cacheFirstContent } = require('./personalSpaceCache');
      return cacheFirstContent()(req, res, next);
    } else if (isGitSpace(req.params.space)) {
      // Use git space cache logic
      return gitCacheFirstContent()(req, res, next);
    } else {
      // No caching for other spaces
      return next();
    }
  };
}

function universalCacheFirstTree() {
  return async (req, res, next) => {
    if (req.params.space === 'Personal') {
      // Use personal space cache logic
      const { cacheFirstTree } = require('./personalSpaceCache');
      return cacheFirstTree()(req, res, next);
    } else if (isGitSpace(req.params.space)) {
      // Use git space cache logic
      return gitCacheFirstTree()(req, res, next);
    } else {
      // No caching for other spaces
      return next();
    }
  };
}

/**
 * Invalidate the cache if we write something
 * @returns I
 */
function universalInvalidateCacheOnWrite() {
  return async (req, res, next) => {
    if (req.params.space === 'Personal') {
      // Use personal space cache logic
      const { invalidateCacheOnWrite } = require('./personalSpaceCache');
      return invalidateCacheOnWrite()(req, res, next);
    } else if (isGitSpace(req.params.space)) {
      // Use git space cache logic
      return gitInvalidateCacheOnWrite()(req, res, next);
    } else {
      // No cache invalidation for other spaces
      return next();
    }
  };
}

module.exports = {
  gitCacheFirstContent,
  gitCacheFirstTree,
  gitCacheFirstTemplates,
  gitInvalidateCacheOnWrite,
  generateGitCacheKeys,
  isGitSpace,
  universalCacheFirstContent,
  universalCacheFirstTree,
  universalInvalidateCacheOnWrite
};