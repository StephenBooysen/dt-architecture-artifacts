/**
 * @fileoverview Git space content processor worker
 * Processes file content for indexing and caching in git spaces
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Service endpoints
const QUEUE_BASE_URL = 'http://localhost:3001/api/queueing';
const CACHE_BASE_URL = 'http://localhost:3001/api/caching';
const SEARCH_BASE_URL = 'http://localhost:3001/api/search';

// Queue names
const QUEUES = {
  CONTENT_PROCESSING_HIGH: 'git-content-processing-high',
  CONTENT_PROCESSING_MEDIUM: 'git-content-processing-medium',
  CONTENT_PROCESSING_LOW: 'git-content-processing-low',
  SEARCH_INDEXING: 'git-search-indexing'
};

/**
 * Cache service helpers
 */
async function setCacheValue(key, value) {
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
 * Generate cache keys for git spaces
 */
function generateGitCacheKeys(spaceName, filePath = '', operation = 'content') {
  const base = `git:${spaceName.toLowerCase()}`;
  
  switch (operation) {
    case 'content':
      return `${base}:content:${filePath}`;
    case 'metadata':
      return `${base}:meta:${filePath}`;
    default:
      return `${base}:${operation}:${filePath}`;
  }
}

/**
 * Extract searchable text from markdown content
 */
function extractSearchableText(content, fileType) {
  if (fileType !== 'markdown') {
    return content; // For non-markdown, return as-is
  }
  
  try {
    // Try to use comment parser if available
    const { getCleanMarkdownContent } = require('../src/utils/commentParser');
    return getCleanMarkdownContent(content);
  } catch (error) {
    // Fallback: simple markdown processing
    return content
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italics
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Extract link text
      .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // Extract image alt text
      .trim();
  }
}

/**
 * Determine file type based on extension
 */
function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (['.md', '.markdown'].includes(ext)) return 'markdown';
  if (['.txt', '.json', '.xml', '.csv'].includes(ext)) return 'text';
  if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'].includes(ext)) return 'image';
  if (['.pdf'].includes(ext)) return 'pdf';
  
  return 'unknown';
}

/**
 * Process content operation for git spaces
 */
async function performGitContentProcessing(operation) {
  const { action, path: filePath, spaceName, spaceAccess, timestamp, fullPath } = operation;
  
  console.log(`Processing git content: ${action} for ${spaceName}:${filePath}`);
  
  try {
    if (action !== 'reindex') {
      console.warn(`Unknown git content action: ${action}`);
      return;
    }
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`Git file no longer exists: ${fullPath}`);
      return;
    }
    
    // Get file stats
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      console.log(`Skipping directory: ${fullPath}`);
      return;
    }
    
    // Determine file type
    const fileType = getFileType(filePath);
    
    if (fileType === 'unknown' || fileType === 'image' || fileType === 'pdf') {
      // For binary files, just cache metadata
      const metaKey = generateGitCacheKeys(spaceName, filePath, 'metadata');
      const metadata = {
        type: fileType,
        size: stats.size,
        mtime: stats.mtime,
        processedAt: new Date().toISOString(),
        space: spaceName,
        access: spaceAccess
      };
      
      await setCacheValue(metaKey, metadata);
      console.log(`Processed git metadata for: ${spaceName}:${filePath}`);
      return;
    }
    
    // Read file content for text-based files
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Process content based on type
    let processedContent = { raw: content };
    if (fileType === 'markdown') {
      try {
        // Try to parse comments if available
        const { getCleanMarkdownContent, extractComments } = require('../src/utils/commentParser');
        const cleanContent = getCleanMarkdownContent(content);
        const comments = extractComments(content);
        
        processedContent = {
          raw: content,
          clean: cleanContent,
          comments: comments,
          type: 'markdown'
        };
      } catch (error) {
        console.warn(`Error processing markdown comments for ${filePath}:`, error.message);
        // Fallback to raw content
        processedContent = {
          raw: content,
          clean: content,
          comments: [],
          type: 'markdown'
        };
      }
    }
    
    // Cache the processed content
    const contentKey = generateGitCacheKeys(spaceName, filePath, 'content');
    await setCacheValue(contentKey, processedContent);
    
    // Cache metadata
    const metaKey = generateGitCacheKeys(spaceName, filePath, 'metadata');
    const metadata = {
      type: fileType,
      size: stats.size,
      mtime: stats.mtime,
      processedAt: new Date().toISOString(),
      space: spaceName,
      access: spaceAccess
    };
    await setCacheValue(metaKey, metadata);
    
    // Queue for search indexing
    const searchableText = extractSearchableText(content, fileType);
    if (searchableText && searchableText.trim()) {
      const searchIndexData = {
        action: 'index',
        path: filePath,
        spaceName: spaceName,
        spaceAccess: spaceAccess,
        content: searchableText,
        type: fileType,
        timestamp: timestamp
      };
      
      await enqueueSearchOperation(searchIndexData);
    }
    
    console.log(`Processed git content for: ${spaceName}:${filePath}`);
    
  } catch (error) {
    console.error(`Error processing git content:`, error);
    throw error;
  }
}

/**
 * Enqueue search operation
 */
async function enqueueSearchOperation(data) {
  try {
    const response = await axios.post(`${QUEUE_BASE_URL}/enqueue/${QUEUES.SEARCH_INDEXING}`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      console.error(`Failed to enqueue search operation:`, response.statusText);
    }
  } catch (error) {
    console.error(`Error enqueuing search operation:`, error.message);
  }
}

/**
 * Poll queues and process operations
 */
async function pollGitContentQueues() {
  const queues = [
    QUEUES.CONTENT_PROCESSING_HIGH,
    QUEUES.CONTENT_PROCESSING_MEDIUM,
    QUEUES.CONTENT_PROCESSING_LOW
  ];
  
  for (const queueName of queues) {
    try {
      // Dequeue operations from this queue
      const response = await axios.get(`${QUEUE_BASE_URL}/dequeue/${queueName}`);
      
      if (response.status === 200 && response.data) {
        const operations = Array.isArray(response.data) ? response.data : [response.data];
        
        for (const operation of operations) {
          try {
            await performGitContentProcessing(operation);
          } catch (error) {
            console.error(`Error processing git content operation from ${queueName}:`, error);
            // Continue processing other operations
          }
        }
        
        if (operations.length > 0) {
          console.log(`Processed ${operations.length} git content operations from ${queueName}`);
        }
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error(`Error polling git content queue ${queueName}:`, error.message);
      }
      // Continue with other queues
    }
  }
}

/**
 * Main processing loop
 */
async function processGitContent() {
  console.log('Starting git space content processor');
  
  while (true) {
    try {
      await pollGitContentQueues();
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error in git content processing loop:', error);
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
    console.log('Git space content processor starting...');
    
    // Start the processing loop
    return processGitContent();
  } catch (error) {
    console.error('Error starting git space content processor:', error);
    throw error;
  }
}

// Support both direct execution and worker thread
if (require.main === module) {
  run().catch(console.error);
} else {
  module.exports = { run };
}