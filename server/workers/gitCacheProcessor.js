/**
 * @fileoverview Git space cache processor worker
 * Processes cache update events from git space file watchers
 */

const axios = require('axios');
const path = require('path');

// Service endpoints
const QUEUE_BASE_URL = 'http://localhost:3001/api/queueing';
const CACHE_BASE_URL = 'http://localhost:3001/api/caching';

// Queue names for git spaces
const QUEUES = {
  CACHE_UPDATES_HIGH: 'git-cache-updates-high',
  CACHE_UPDATES_MEDIUM: 'git-cache-updates-medium', 
  CACHE_UPDATES_LOW: 'git-cache-updates-low'
};

/**
 * Cache service helpers
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
 * Generate cache keys for git spaces
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
    default:
      return `${base}:${operation}:${filePath}`;
  }
}

/**
 * Process a cache operation for git spaces
 */
async function performGitCacheOperation(operation) {
  const { action, path: filePath, spaceName, spaceAccess, timestamp } = operation;
  
  console.log(`Processing git cache operation: ${action} for ${spaceName}:${filePath}`);
  
  try {
    switch (action) {
      case 'invalidate':
        // Remove content and metadata from cache
        const contentKey = generateGitCacheKeys(spaceName, filePath, 'content');
        const metaKey = generateGitCacheKeys(spaceName, filePath, 'metadata');
        
        await deleteCacheValue(contentKey);
        await deleteCacheValue(metaKey);
        
        console.log(`Invalidated git cache for: ${spaceName}:${filePath}`);
        break;
        
      case 'remove':
        // Remove all references to this file from cache
        const removeContentKey = generateGitCacheKeys(spaceName, filePath, 'content');
        const removeMetaKey = generateGitCacheKeys(spaceName, filePath, 'metadata');
        
        await deleteCacheValue(removeContentKey);
        await deleteCacheValue(removeMetaKey);
        
        console.log(`Removed from git cache: ${spaceName}:${filePath}`);
        break;
        
      case 'refresh-tree':
        // Invalidate tree cache to force refresh
        const treeKey = generateGitCacheKeys(spaceName, '', 'tree');
        await deleteCacheValue(treeKey);
        
        console.log(`Refreshed git tree cache for space: ${spaceName}`);
        break;
        
      default:
        console.warn(`Unknown git cache action: ${action}`);
    }
  } catch (error) {
    console.error(`Error performing git cache operation:`, error);
    throw error;
  }
}

/**
 * Poll queues and process operations
 */
async function pollGitCacheQueues() {
  const queues = Object.values(QUEUES);
  
  for (const queueName of queues) {
    try {
      // Dequeue operations from this queue
      const response = await axios.get(`${QUEUE_BASE_URL}/dequeue/${queueName}`);
      
      if (response.status === 200 && response.data) {
        const operations = Array.isArray(response.data) ? response.data : [response.data];
        
        for (const operation of operations) {
          try {
            await performGitCacheOperation(operation);
          } catch (error) {
            console.error(`Error processing git cache operation from ${queueName}:`, error);
            // Continue processing other operations
          }
        }
        
        if (operations.length > 0) {
          console.log(`Processed ${operations.length} git cache operations from ${queueName}`);
        }
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error(`Error polling git cache queue ${queueName}:`, error.message);
      }
      // Continue with other queues
    }
  }
}

/**
 * Main processing loop
 */
async function processGitCacheUpdates() {
  console.log('Starting git space cache processor');
  
  while (true) {
    try {
      await pollGitCacheQueues();
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error in git cache processing loop:', error);
      // Continue processing
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

/**
 * Export run function for worker thread compatibility
 */
async function run() {
  try {
    console.log('Git space cache processor starting...');
    
    // Start the processing loop
    return processGitCacheUpdates();
  } catch (error) {
    console.error('Error starting git space cache processor:', error);
    throw error;
  }
}

// Support both direct execution and worker thread
if (require.main === module) {
  run().catch(console.error);
} else {
  module.exports = { run };
}