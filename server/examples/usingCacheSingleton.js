/**
 * Example: Using the cache singleton throughout your application
 */

// In any route file or module
const cacheService = require('../src/services/caching/singleton');

// Example route
async function getUserRoute(req, res) {
  const userId = req.params.id;
  const cacheKey = `user:${userId}`;
  
  try {
    // Get from cache using singleton
    let userData = await cacheService.get(cacheKey);
    
    if (!userData) {
      // Cache miss - fetch from database
      userData = await fetchUserFromDatabase(userId);
      
      // Store in cache for 10 minutes (you'd need to implement TTL)
      await cacheService.put(cacheKey, userData);
      console.log('User data cached');
    } else {
      console.log('User data retrieved from cache');
    }
    
    res.json(userData);
  } catch (error) {
    console.error('Error in getUserRoute:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Example utility function
async function cacheFileContent(filePath, content) {
  const cacheService = require('../src/services/caching/singleton');
  const cacheKey = `file:${filePath}`;
  
  await cacheService.put(cacheKey, {
    content,
    timestamp: Date.now(),
    path: filePath
  });
}

// Example middleware
function createCacheMiddleware(ttl = 300000) { // 5 minutes default
  return async (req, res, next) => {
    const cacheService = require('../src/services/caching/singleton');
    const cacheKey = `route:${req.method}:${req.originalUrl}`;
    
    try {
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        console.log('Serving from cache:', cacheKey);
        return res.json(cachedResponse);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        cacheService.put(cacheKey, data).catch(console.error);
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Continue without caching on error
    }
  };
}

module.exports = {
  getUserRoute,
  cacheFileContent,
  createCacheMiddleware
};