/**
 * @fileoverview Content processing worker
 * Processes file content for indexing and caching
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Queue service endpoints
const QUEUE_BASE_URL = 'http://localhost:3001/api/queueing';
const CACHE_BASE_URL = 'http://localhost:3001/api/caching';
const SEARCH_BASE_URL = 'http://localhost:3001/api/searching';

// Queue names for different priorities
const CONTENT_QUEUES = [
  'content-processing-high',
  'content-processing-medium',
  'content-processing-low'
];

/**
 * Dequeue with priority (check high priority first)
 */
async function dequeueWithPriority() {
  for (const queueName of CONTENT_QUEUES) {
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
 * Enqueue to another queue
 */
async function enqueueTask(queueName, task) {
  try {
    const response = await axios.post(`${QUEUE_BASE_URL}/enqueue/${queueName}`, task, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      console.error(`Failed to enqueue to ${queueName}:`, response.statusText);
    }
  } catch (error) {
    console.error(`Error enqueuing to ${queueName}:`, error.message);
  }
}

/**
 * Read and process file content
 */
async function processFileContent(filePath, username, relativePath) {
  try {
    // Check if file exists
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return null;
    }
    
    const ext = path.extname(relativePath).toLowerCase();
    let content = null;
    let processedContent = null;
    let searchableText = '';
    
    // Process different file types
    if (['.md', '.markdown', '.txt', '.json'].includes(ext)) {
      // Read text files
      content = await fs.readFile(filePath, 'utf8');
      
      if (ext === '.md' || ext === '.markdown') {
        // For markdown files, extract clean content for search
        searchableText = extractMarkdownText(content);
        processedContent = {
          raw: content,
          clean: searchableText,
          type: 'markdown'
        };
      } else if (ext === '.json') {
        // For JSON files, make content searchable
        try {
          const jsonData = JSON.parse(content);
          searchableText = JSON.stringify(jsonData, null, 2);
          processedContent = {
            raw: content,
            parsed: jsonData,
            type: 'json'
          };
        } catch (e) {
          searchableText = content;
          processedContent = {
            raw: content,
            type: 'json',
            error: 'Invalid JSON'
          };
        }
      } else {
        searchableText = content;
        processedContent = {
          raw: content,
          type: 'text'
        };
      }
    } else if (['.pdf', '.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      // For binary files, just store metadata
      searchableText = `${path.basename(relativePath)} ${ext.substring(1)} file`;
      processedContent = {
        type: 'binary',
        extension: ext,
        size: stats.size,
        mtime: stats.mtime
      };
    }
    
    return {
      content: processedContent,
      searchableText,
      metadata: {
        path: relativePath,
        username,
        size: stats.size,
        mtime: stats.mtime,
        type: ext.substring(1),
        processedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract searchable text from markdown content
 */
function extractMarkdownText(markdownContent) {
  // Remove markdown syntax for better search
  let text = markdownContent
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove emphasis
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
    
  return text;
}

/**
 * Process content task
 */
async function processContentTask(task) {
  const { action, path: relativePath, username, fullPath, timestamp } = task;
  
  switch (action) {
    case 'reindex':
      console.log(`Processing content: ${username}:${relativePath}`);
      
      const processed = await processFileContent(fullPath, username, relativePath);
      if (!processed) {
        console.warn(`Failed to process content for: ${username}:${relativePath}`);
        return;
      }
      
      // Queue cache update with processed content
      await enqueueTask('cache-updates-medium', {
        action: 'update',
        path: relativePath,
        username,
        timestamp,
        content: processed.content,
        metadata: processed.metadata
      });
      
      // Queue search indexing
      await enqueueTask('search-indexing-medium', {
        action: 'index',
        path: relativePath,
        username,
        timestamp,
        searchableText: processed.searchableText,
        metadata: processed.metadata
      });
      
      break;
      
    case 'batch-reindex':
      // Process multiple files in batch
      const { files, batchId } = task;
      console.log(`Processing batch ${batchId}: ${files.length} files`);
      
      for (const filePath of files) {
        const fullFilePath = path.join(path.dirname(fullPath), filePath);
        await enqueueTask('content-processing-medium', {
          action: 'reindex',
          path: filePath,
          username,
          timestamp,
          fullPath: fullFilePath
        });
      }
      
      break;
      
    default:
      console.warn(`Unknown content processing action: ${action}`);
  }
}

/**
 * Main processing loop
 */
async function processQueue() {
  console.log('Content processor started, monitoring queues:', CONTENT_QUEUES.join(', '));
  
  while (true) {
    try {
      const task = await dequeueWithPriority();
      
      if (task) {
        await processContentTask(task);
      } else {
        // No tasks available, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error in content processor loop:', error);
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
    
    console.log('Content processor health check passed');
    return true;
  } catch (error) {
    console.error('Content processor health check failed:', error.message);
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
      throw new Error('Content processor failed to connect to required services');
    }
    
    // Start processing
    await processQueue();
  } catch (error) {
    console.error('Error starting content processor:', error);
    throw error;
  }
}

// Support both direct execution and worker thread
if (require.main === module) {
  run().catch(console.error);
} else {
  module.exports = { run };
}