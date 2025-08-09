/**
 * @fileoverview Personal space file system watcher worker
 * Monitors file changes and queues them for processing
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const axios = require('axios');

// Configuration
const PERSONAL_CONTENT_PATH = path.join(__dirname, '../../content');
const WATCH_OPTIONS = {
  ignored: [
    '**/.git/**',
    '**/node_modules/**',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/*.tmp',
    '**/*.swp',
    '**/*.lock'
  ],
  persistent: true,
  ignoreInitial: false,
  followSymlinks: false,
  depth: 10,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  }
};

// Queue service endpoints
const QUEUE_BASE_URL = 'http://localhost:3001/api/queueing';

/**
 * Queue names for different processing stages
 */
const QUEUES = {
  FILE_EVENTS: 'file-events',
  CACHE_UPDATES: 'cache-updates',
  SEARCH_INDEXING: 'search-indexing',
  CONTENT_PROCESSING: 'content-processing'
};

/**
 * Send HTTP request to queue service
 */
async function enqueueEvent(queueName, eventData) {
  try {
    const response = await axios.post(`${QUEUE_BASE_URL}/enqueue/${queueName}`, eventData, {
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
 * Get file priority for processing order
 */
function getFilePriority(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  
  // High priority: config files, templates
  if (basename.includes('config') || filePath.includes('templates/') || ext === '.json') {
    return 'high';
  }
  
  // Medium priority: markdown content files
  if (ext === '.md' || ext === '.markdown') {
    return 'medium';
  }
  
  // Low priority: assets, images, logs
  if (['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.log', '.txt'].includes(ext)) {
    return 'low';
  }
  
  return 'medium';
}

/**
 * Check if file is in personal space and get username
 */
function getPersonalSpaceUser(filePath) {
  const relativePath = path.relative(PERSONAL_CONTENT_PATH, filePath);
  const segments = relativePath.split(path.sep);
  
  // Personal space structure: content/{username}/markdown/* or content/{username}/templates/*
  if (segments.length >= 2 && !segments[0].startsWith('.')) {
    return segments[0]; // username
  }
  
  return null;
}

/**
 * Create file event data structure
 */
function createFileEvent(eventType, filePath, stats = null) {
  const username = getPersonalSpaceUser(filePath);
  
  if (!username) {
    return null; // Skip non-personal space files
  }
  
  const relativePath = path.relative(path.join(PERSONAL_CONTENT_PATH, username), filePath);
  
  return {
    type: eventType,
    path: filePath,
    relativePath,
    username,
    timestamp: Date.now(),
    priority: getFilePriority(filePath),
    size: stats ? stats.size : null,
    isDirectory: stats ? stats.isDirectory() : false,
    mtime: stats ? stats.mtime : null
  };
}

/**
 * Process file system events
 */
async function handleFileEvent(event, filePath, stats = null) {
  console.log(`File ${event}: ${filePath}`);
  
  const fileEvent = createFileEvent(event, filePath, stats);
  if (!fileEvent) {
    return; // Skip non-personal space files
  }
  
  // Queue the raw file event
  await enqueueEvent(QUEUES.FILE_EVENTS, fileEvent);
  
  // Queue specific processing tasks based on event type
  switch (event) {
    case 'add':
    case 'change':
      // Queue cache update to invalidate old content
      await enqueueEvent(`${QUEUES.CACHE_UPDATES}-${fileEvent.priority}`, {
        action: 'invalidate',
        path: fileEvent.relativePath,
        username: fileEvent.username,
        timestamp: fileEvent.timestamp
      });
      
      // Queue content processing for indexing
      if (!fileEvent.isDirectory) {
        await enqueueEvent(`${QUEUES.CONTENT_PROCESSING}-${fileEvent.priority}`, {
          action: 'reindex',
          path: fileEvent.relativePath,
          username: fileEvent.username,
          timestamp: fileEvent.timestamp,
          fullPath: filePath
        });
      }
      break;
      
    case 'unlink':
    case 'unlinkDir':
      // Queue removal from cache
      await enqueueEvent(`${QUEUES.CACHE_UPDATES}-${fileEvent.priority}`, {
        action: 'remove',
        path: fileEvent.relativePath,
        username: fileEvent.username,
        timestamp: fileEvent.timestamp
      });
      
      // Queue removal from search index
      await enqueueEvent(`${QUEUES.SEARCH_INDEXING}-${fileEvent.priority}`, {
        action: 'remove',
        path: fileEvent.relativePath,
        username: fileEvent.username,
        timestamp: fileEvent.timestamp
      });
      break;
      
    case 'addDir':
      // Queue directory structure cache update
      await enqueueEvent(`${QUEUES.CACHE_UPDATES}-${fileEvent.priority}`, {
        action: 'refresh-tree',
        path: fileEvent.relativePath,
        username: fileEvent.username,
        timestamp: fileEvent.timestamp
      });
      break;
  }
}

/**
 * Initialize file system watcher
 */
function startWatcher() {
  console.log(`Starting personal space watcher for: ${PERSONAL_CONTENT_PATH}`);
  
  const watcher = chokidar.watch(PERSONAL_CONTENT_PATH, WATCH_OPTIONS);
  
  watcher
    .on('add', (filePath, stats) => handleFileEvent('add', filePath, stats))
    .on('change', (filePath, stats) => handleFileEvent('change', filePath, stats))
    .on('unlink', (filePath) => handleFileEvent('unlink', filePath))
    .on('addDir', (filePath, stats) => handleFileEvent('addDir', filePath, stats))
    .on('unlinkDir', (filePath) => handleFileEvent('unlinkDir', filePath))
    .on('ready', () => {
      console.log('Personal space file system watcher is ready');
    })
    .on('error', (error) => {
      console.error('File system watcher error:', error);
    });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down personal space watcher...');
    watcher.close().then(() => {
      console.log('Personal space watcher shut down gracefully');
      process.exit(0);
    });
  });
  
  return watcher;
}

/**
 * Export run function for worker thread compatibility
 */
async function run() {
  try {
    // Ensure content directory exists
    if (!fs.existsSync(PERSONAL_CONTENT_PATH)) {
      fs.mkdirSync(PERSONAL_CONTENT_PATH, { recursive: true });
      console.log(`Created personal content directory: ${PERSONAL_CONTENT_PATH}`);
    }
    
    const watcher = startWatcher();
    
    // Keep the worker alive
    return new Promise((resolve, reject) => {
      process.on('SIGTERM', () => {
        watcher.close().then(resolve).catch(reject);
      });
    });
  } catch (error) {
    console.error('Error starting personal space watcher:', error);
    throw error;
  }
}

// Support both direct execution and worker thread
if (require.main === module) {
  run().catch(console.error);
} else {
  module.exports = { run };
}