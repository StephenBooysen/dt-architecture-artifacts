/**
 * Example: Using Dependency Injection Container
 */

const container = require('../src/services/container');
const createCache = require('../src/services/caching');

// Register services in your main server file
function initializeServices(app, eventEmitter) {
  // Register cache service
  container.register('cache', () => {
    return createCache('redis', { 
      'express-app': app,
      host: 'localhost',
      port: 6379 
    }, eventEmitter);
  }, true); // true = singleton
  
  // Register other services
  container.register('logger', () => {
    return require('./src/services/logging')('', { 'express-app': app }, eventEmitter);
  }, true);
  
  container.register('emailService', () => {
    return new EmailService();
  }, true);
}

// Use services anywhere in your app
async function userController(req, res) {
  const cache = container.get('cache');
  const logger = container.get('logger');
  
  try {
    const userData = await cache.get(`user:${req.params.id}`);
    
    if (!userData) {
      const freshData = await fetchUser(req.params.id);
      await cache.put(`user:${req.params.id}`, freshData);
      logger.info('User data cached', { userId: req.params.id });
      res.json(freshData);
    } else {
      logger.info('User data served from cache', { userId: req.params.id });
      res.json(userData);
    }
  } catch (error) {
    logger.error('Error in user controller', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { initializeServices, userController };