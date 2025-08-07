/**
 * @fileoverview Example of how to use singleton services in route handlers.
 * This demonstrates best practices for integrating services into your Express routes.
 */

const express = require('express');
const { getLogger, getCache, getFiling, getMeasuring, recordMetric } = require('../src/utils/services');

const router = express.Router();

/**
 * Example route using multiple services
 */
router.get('/api/files/:path', async (req, res) => {
  const startTime = Date.now();
  const { path: filePath } = req.params;
  const logger = getLogger();
  const cache = getCache();
  const filing = getFiling();
  
  try {
    // Log the request
    logger.info('File request received', { 
      path: filePath, 
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });

    // Try cache first
    const cacheKey = `file:${filePath}`;
    let fileData = await cache.get(cacheKey);
    
    if (fileData) {
      logger.info('Cache hit for file', { path: filePath });
      recordMetric('file.cache.hit', 1, { path: filePath });
    } else {
      logger.info('Cache miss for file', { path: filePath });
      recordMetric('file.cache.miss', 1, { path: filePath });
      
      // Fetch from filing service
      if (!await filing.exists(filePath)) {
        logger.warn('File not found', { path: filePath });
        return res.status(404).json({ error: 'File not found' });
      }
      
      fileData = await filing.readFile(filePath);
      
      // Cache the result for 5 minutes
      await cache.put(cacheKey, fileData);
      logger.info('File cached', { path: filePath });
    }

    // Record response time
    const responseTime = Date.now() - startTime;
    recordMetric('file.response_time', responseTime, { path: filePath });
    
    res.json({
      path: filePath,
      content: fileData,
      cached: !!fileData,
      responseTime
    });

  } catch (error) {
    logger.error('Error serving file', { 
      path: filePath, 
      error: error.message,
      stack: error.stack 
    });
    
    recordMetric('file.error', 1, { 
      path: filePath, 
      error: error.constructor.name 
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      requestId: req.id // Assuming you have request ID middleware
    });
  }
});

/**
 * Example route for creating files
 */
router.post('/api/files', async (req, res) => {
  const logger = getLogger();
  const filing = getFiling();
  const cache = getCache();
  
  try {
    const { path: filePath, content } = req.body;
    
    if (!filePath || !content) {
      return res.status(400).json({ 
        error: 'Path and content are required' 
      });
    }

    logger.info('Creating new file', { 
      path: filePath, 
      contentLength: content.length 
    });

    // Write file using filing service
    await filing.writeFile(filePath, content);
    
    // Invalidate cache
    await cache.delete(`file:${filePath}`);
    
    // Record metrics
    recordMetric('file.created', 1, { path: filePath });
    recordMetric('file.size', content.length, { path: filePath });
    
    logger.info('File created successfully', { path: filePath });
    
    res.json({
      success: true,
      path: filePath,
      size: content.length
    });

  } catch (error) {
    logger.error('Error creating file', { 
      error: error.message,
      stack: error.stack 
    });
    
    recordMetric('file.creation_error', 1);
    
    res.status(500).json({ error: 'Failed to create file' });
  }
});

/**
 * Example route with caching middleware
 */
function createCacheMiddleware(ttl = 300000) { // 5 minutes default
  return async (req, res, next) => {
    const cache = getCache();
    const logger = getLogger();
    
    if (!cache.isReady()) {
      return next(); // Skip caching if not available
    }
    
    const cacheKey = `route:${req.method}:${req.originalUrl}`;
    
    try {
      const cachedResponse = await cache.get(cacheKey);
      
      if (cachedResponse) {
        logger.info('Serving cached response', { 
          route: req.originalUrl,
          cacheKey 
        });
        
        recordMetric('route.cache.hit', 1, { route: req.route?.path });
        return res.json(cachedResponse);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.put(cacheKey, data).catch(err => {
            logger.error('Failed to cache response', { 
              cacheKey, 
              error: err.message 
            });
          });
        }
        return originalJson.call(this, data);
      };
      
      recordMetric('route.cache.miss', 1, { route: req.route?.path });
      next();
      
    } catch (error) {
      logger.error('Cache middleware error', { 
        cacheKey, 
        error: error.message 
      });
      next(); // Continue without caching on error
    }
  };
}

/**
 * Example route using cache middleware
 */
router.get('/api/expensive-operation', 
  createCacheMiddleware(600000), // 10 minutes cache
  async (req, res) => {
    const logger = getLogger();
    const startTime = Date.now();
    
    try {
      logger.info('Performing expensive operation');
      
      // Simulate expensive operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = {
        timestamp: new Date().toISOString(),
        data: 'This is the result of an expensive operation',
        processingTime: Date.now() - startTime
      };
      
      recordMetric('expensive_operation.duration', result.processingTime);
      
      res.json(result);
      
    } catch (error) {
      logger.error('Expensive operation failed', { 
        error: error.message 
      });
      
      recordMetric('expensive_operation.error', 1);
      res.status(500).json({ error: 'Operation failed' });
    }
  }
);

module.exports = router;