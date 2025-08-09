/**
 * @fileoverview Search index processor worker
 * Updates search service with processed content
 */

const axios = require('axios');

// Queue service endpoints
const QUEUE_BASE_URL = 'http://localhost:3001/api/queueing';
const SEARCH_BASE_URL = 'http://localhost:3001/api/searching';

// Queue names for different priorities
const SEARCH_QUEUES = [
  'search-indexing-high',
  'search-indexing-medium',
  'search-indexing-low'
];

/**
 * Dequeue with priority (check high priority first)
 */
async function dequeueWithPriority() {
  for (const queueName of SEARCH_QUEUES) {
    try {
      const response = await axios.get(`${QUEUE_BASE_URL}/dequeue/${queueName}`);
      
      if (response.status === 200 && response.data) {
        const task = response.data;
        if (task && typeof task === 'object' && task.action) {
          return task;
        }
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error(`Error dequeuing from ${queueName}:`, error.message);
      }
    }
  }
  return null;
}

/**
 * Search service operations
 */
async function addToSearchIndex(key, searchData) {
  try {
    const response = await axios.post(`${SEARCH_BASE_URL}/add/${encodeURIComponent(key)}`, searchData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      console.error(`Failed to add to search index ${key}:`, response.statusText);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error adding to search index ${key}:`, error.message);
    return false;
  }
}

async function removeFromSearchIndex(key) {
  try {
    const response = await axios.delete(`${SEARCH_BASE_URL}/remove/${encodeURIComponent(key)}`);
    
    if (response.status !== 200) {
      console.error(`Failed to remove from search index ${key}:`, response.statusText);
      return false;
    }
    
    return true;
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error(`Error removing from search index ${key}:`, error.message);
      return false;
    }
    return true;
  }
}

/**
 * Process search indexing task
 */
async function processSearchTask(task) {
  const { action, path: relativePath, username, searchableText, metadata } = task;
  
  // Create a unique search key for this user's file
  const searchKey = `personal:${username}:${relativePath}`;
  
  switch (action) {
    case 'index':
      console.log(`Indexing for search: ${username}:${relativePath}`);
      
      const searchData = {
        path: relativePath,
        username,
        content: searchableText,
        title: extractTitle(searchableText, relativePath),
        type: metadata.type,
        size: metadata.size,
        mtime: metadata.mtime,
        indexedAt: new Date().toISOString(),
        // Additional searchable fields
        filename: relativePath.split('/').pop(),
        directory: relativePath.split('/').slice(0, -1).join('/'),
        extension: metadata.type
      };
      
      await addToSearchIndex(searchKey, searchData);
      break;
      
    case 'remove':
      console.log(`Removing from search index: ${username}:${relativePath}`);
      await removeFromSearchIndex(searchKey);
      break;
      
    case 'bulk-index':
      // Handle bulk indexing operations
      const { items } = task;
      console.log(`Bulk indexing ${items.length} items for user: ${username}`);
      
      for (const item of items) {
        const itemSearchKey = `personal:${username}:${item.path}`;
        await addToSearchIndex(itemSearchKey, item.searchData);
      }
      break;
      
    default:
      console.warn(`Unknown search indexing action: ${action}`);
  }
}

/**
 * Extract title from content for search results
 */
function extractTitle(content, filePath) {
  if (!content) {
    return filePath.split('/').pop();
  }
  
  // Try to extract first line or first few words as title
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim();
  
  if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
    return firstLine;
  }
  
  // If first line is too long, take first few words
  const words = content.trim().split(/\s+/).slice(0, 10);
  if (words.length > 0) {
    return words.join(' ') + (words.length === 10 ? '...' : '');
  }
  
  // Fallback to filename
  return filePath.split('/').pop();
}

/**
 * Main processing loop
 */
async function processQueue() {
  console.log('Search processor started, monitoring queues:', SEARCH_QUEUES.join(', '));
  
  while (true) {
    try {
      const task = await dequeueWithPriority();
      
      if (task) {
        await processSearchTask(task);
      } else {
        // No tasks available, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error in search processor loop:', error);
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
    const response = await axios.get(`${QUEUE_BASE_URL}/status`);
    if (response.status !== 200) {
      throw new Error(`Queue service unhealthy: ${response.status}`);
    }
    
    const searchResponse = await axios.get(`${SEARCH_BASE_URL}/status`);
    if (searchResponse.status !== 200) {
      throw new Error(`Search service unhealthy: ${searchResponse.status}`);
    }
    
    console.log('Search processor health check passed');
    return true;
  } catch (error) {
    console.error('Search processor health check failed:', error.message);
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
      throw new Error('Search processor failed to connect to required services');
    }
    
    // Start processing
    await processQueue();
  } catch (error) {
    console.error('Error starting search processor:', error);
    throw error;
  }
}

// Support both direct execution and worker thread
if (require.main === module) {
  run().catch(console.error);
} else {
  module.exports = { run };
}