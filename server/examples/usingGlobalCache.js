/**
 * Example: Using the simple global cache
 */

const { initializeCache, getCache } = require('../src/services/caching/globalCache');

// Initialize once in your main server file
// initializeCache('redis', { host: 'localhost', port: 6379 }, eventEmitter);

// Then use anywhere in your app
async function someRoute(req, res) {
  const cache = getCache(); // Gets the initialized cache instance
  
  const data = await cache.get('some-key');
  if (!data) {
    const freshData = await fetchDataFromDB();
    await cache.put('some-key', freshData);
    res.json(freshData);
  } else {
    res.json(data);
  }
}

module.exports = { someRoute };