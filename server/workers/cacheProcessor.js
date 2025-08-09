/**
 * @fileoverview Cache update processor worker
 * Processes cache update events from the queue
 */

const path = require('path');
const axios = require('axios');

// Queue service endpoints
const QUEUE_BASE_URL = 'http://localhost:3001/api/queueing';
const CACHE_BASE_URL = 'http://localhost:3001/api/caching';

// Queue names for different priorities
const CACHE_QUEUES = [
  'cache-updates-high',
  'cache-updates-medium', 
  'cache-updates-low'
];

/**
 * Dequeue with priority (check high priority first)
 */
async function dequeueWithPriority() {
  for (const queueName of CACHE_QUEUES) {
    try {
      const response = await axios.get(`${QUEUE_BASE_URL}/dequeue/${queueName}`);
      
      if (response.status === 200 && response.data) {
        const task = response.data;
        if (task && typeof task === 'object' && task.action) {
          return task;
        }
      }
    } catch (error) {
      // 404 is expected when queue is empty
      if (error.response?.status !== 404) {
        console.error(`Error dequeuing from ${queueName}:`, error.message);
      }
    }
  }
  return null;
}

/**
 * Cache operations
 */
async function performCacheOperation(operation) {
  try {
    const { action, path: filePath, username, timestamp } = operation;
    
    // Generate cache keys for different types of data
    const cacheKeys = {
      content: `personal:${username}:content:${filePath}`,
      metadata: `personal:${username}:meta:${filePath}`, 
      tree: `personal:${username}:tree`,
      list: `personal:${username}:list:${path.dirname(filePath)}`
    };
    
    switch (action) {
      case 'invalidate':
        // Remove cached content and metadata for the file
        await Promise.all([
          deleteCacheKey(cacheKeys.content),
          deleteCacheKey(cacheKeys.metadata),
          deleteCacheKey(cacheKeys.tree), // Directory tree needs refresh
          deleteCacheKey(cacheKeys.list)  // Directory listing needs refresh
        ]);
        console.log(`Invalidated cache for: ${username}:${filePath}`);
        break;
        
      case 'remove':
        // Remove all cached data for deleted file
        await Promise.all([
          deleteCacheKey(cacheKeys.content),
          deleteCacheKey(cacheKeys.metadata),
          deleteCacheKey(cacheKeys.tree),
          deleteCacheKey(cacheKeys.list)
        ]);
        console.log(`Removed from cache: ${username}:${filePath}`);
        break;
        
      case 'refresh-tree':
        // Just invalidate directory tree cache
        await deleteCacheKey(cacheKeys.tree);
        console.log(`Refreshed tree cache for: ${username}:${path.dirname(filePath)}`);
        break;
        
      case 'update':
        // Cache new content (this would come from content processor)
        const { content, metadata } = operation;
        await Promise.all([
          setCacheKey(cacheKeys.content, content),
          setCacheKey(cacheKeys.metadata, metadata)
        ]);
        console.log(`Updated cache for: ${username}:${filePath}`);
        break;
        
      default:
        console.warn(`Unknown cache action: ${action}`);
    }
    
  } catch (error) {
    console.error('Error performing cache operation:', error);
  }
}

/**
 * Cache service helpers
 */
async function setCacheKey(key, value) {
  try {
    const response = await axios.post(`${CACHE_BASE_URL}/put/${encodeURIComponent(key)}`, value, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      console.error(`Failed to set cache key ${key}:`, response.statusText);
    }
  } catch (error) {
    console.error(`Error setting cache key ${key}:`, error.message);
  }
}

async function deleteCacheKey(key) {
  try {
    const response = await axios.delete(`${CACHE_BASE_URL}/delete/${encodeURIComponent(key)}`);
    
    if (response.status !== 200) {
      console.error(`Failed to delete cache key ${key}:`, response.statusText);
    }
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error(`Error deleting cache key ${key}:`, error.message);
    }
  }
}

/**
 * Main processing loop
 */
async function processQueue() {
  console.log('Cache processor started, monitoring queues:', CACHE_QUEUES.join(', '));
  
  while (true) {
    try {
      const task = await dequeueWithPriority();
      
      if (task) {
        await performCacheOperation(task);
      } else {
        // No tasks available, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error in cache processor loop:', error);
      // Wait a bit before retrying to avoid tight error loops
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

/**
 * Health check - verify queue service connectivity
 */
async function healthCheck() {
  try {
    const queueResponse = await axios.get(`${QUEUE_BASE_URL}/status`);
    if (queueResponse.status !== 200) {
      throw new Error(`Queue service unhealthy: ${queueResponse.status}`);
    }
    
    const cacheResponse = await axios.get(`${CACHE_BASE_URL}/status`);
    if (cacheResponse.status !== 200) {
      throw new Error(`Cache service unhealthy: ${cacheResponse.status}`);
    }
    
    console.log('Cache processor health check passed');
    return true;
  } catch (error) {
    console.error('Cache processor health check failed:', error.message);
    return false;
  }
}

/**
 * Export run function for worker thread compatibility
 */
async function run() {
  try {
    // Wait for services to be ready
    let retries = 10;
    while (retries > 0 && !(await healthCheck())) {
      console.log(`Waiting for services... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      retries--;
    }
    
    if (retries === 0) {
      throw new Error('Cache processor failed to connect to required services');
    }
    
    // Start processing
    await processQueue();
  } catch (error) {
    console.error('Error starting cache processor:', error);
    throw error;
  }
}

// Support both direct execution and worker thread
if (require.main === module) {
  run().catch(console.error);
} else {
  module.exports = { run };
}