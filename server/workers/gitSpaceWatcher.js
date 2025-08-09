/**
 * @fileoverview Git space file system watcher worker
 * Monitors file changes in git-based spaces and queues them for processing
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const axios = require('axios');

// Configuration
const GIT_SPACES_CONFIG_PATH = path.join(__dirname, '../../server-data/spaces.json');

// Git space directories - will be dynamically loaded from config
let gitSpacePaths = [];

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
  FILE_EVENTS: 'git-file-events',
  CACHE_UPDATES: 'git-cache-updates',
  SEARCH_INDEXING: 'git-search-indexing',
  CONTENT_PROCESSING: 'git-content-processing'
};

/**
 * Load git spaces from configuration
 */
function loadGitSpaces() {
  try {
    if (!fs.existsSync(GIT_SPACES_CONFIG_PATH)) {
      console.log('Spaces configuration not found');
      return [];
    }

    const spacesData = fs.readFileSync(GIT_SPACES_CONFIG_PATH, 'utf8');
    const spaces = JSON.parse(spacesData);
    
    // Filter only git spaces and extract their local paths
    const gitSpaces = spaces
      .filter(space => space.filing?.type === 'git')
      .map(space => ({
        name: space.space,
        localPath: path.resolve(__dirname, '../..', space.filing.localFolder),
        access: space.access,
        visibility: space.visibility
      }));
    
    console.log('Loaded git spaces:', gitSpaces.map(s => `${s.name} (${s.localPath})`));
    return gitSpaces;
  } catch (error) {
    console.error('Error loading git spaces configuration:', error);
    return [];
  }
}

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
  
  // High priority: config files, templates, git metadata
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
 * Get git space information from file path
 */
function getGitSpaceInfo(filePath) {
  const gitSpace = gitSpacePaths.find(space => filePath.startsWith(space.localPath));
  
  if (!gitSpace) {
    return null;
  }
  
  // Calculate relative path from space root
  const relativePath = path.relative(gitSpace.localPath, filePath);
  
  return {
    spaceName: gitSpace.name,
    spaceAccess: gitSpace.access,
    spaceVisibility: gitSpace.visibility,
    localPath: gitSpace.localPath,
    relativePath
  };
}

/**
 * Create file event data structure for git spaces
 */
function createGitFileEvent(eventType, filePath, stats = null) {
  const spaceInfo = getGitSpaceInfo(filePath);
  
  if (!spaceInfo) {
    return null; // Skip non-git space files
  }
  
  return {
    type: eventType,
    path: filePath,
    relativePath: spaceInfo.relativePath,
    spaceName: spaceInfo.spaceName,
    spaceAccess: spaceInfo.spaceAccess,
    spaceVisibility: spaceInfo.spaceVisibility,
    timestamp: Date.now(),
    priority: getFilePriority(filePath),
    size: stats ? stats.size : null,
    isDirectory: stats ? stats.isDirectory() : false,
    mtime: stats ? stats.mtime : null,
    isReadonly: spaceInfo.spaceAccess === 'readonly'
  };
}

/**
 * Process file system events for git spaces
 */
async function handleGitFileEvent(event, filePath, stats = null) {
  console.log(`Git space file ${event}: ${filePath}`);
  
  const fileEvent = createGitFileEvent(event, filePath, stats);
  if (!fileEvent) {
    return; // Skip non-git space files
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
        spaceName: fileEvent.spaceName,
        spaceAccess: fileEvent.spaceAccess,
        timestamp: fileEvent.timestamp
      });
      
      // Queue content processing for indexing (only for non-directory files)
      if (!fileEvent.isDirectory) {
        await enqueueEvent(`${QUEUES.CONTENT_PROCESSING}-${fileEvent.priority}`, {
          action: 'reindex',
          path: fileEvent.relativePath,
          spaceName: fileEvent.spaceName,
          spaceAccess: fileEvent.spaceAccess,
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
        spaceName: fileEvent.spaceName,
        spaceAccess: fileEvent.spaceAccess,
        timestamp: fileEvent.timestamp
      });
      
      // Queue removal from search index
      await enqueueEvent(`${QUEUES.SEARCH_INDEXING}-${fileEvent.priority}`, {
        action: 'remove',
        path: fileEvent.relativePath,
        spaceName: fileEvent.spaceName,
        spaceAccess: fileEvent.spaceAccess,
        timestamp: fileEvent.timestamp
      });
      break;
      
    case 'addDir':
      // Queue directory structure cache update
      await enqueueEvent(`${QUEUES.CACHE_UPDATES}-${fileEvent.priority}`, {
        action: 'refresh-tree',
        path: fileEvent.relativePath,
        spaceName: fileEvent.spaceName,
        spaceAccess: fileEvent.spaceAccess,
        timestamp: fileEvent.timestamp
      });
      break;
  }
}

/**
 * Initialize file system watchers for all git spaces
 */
function startGitWatchers() {
  gitSpacePaths = loadGitSpaces();
  
  if (gitSpacePaths.length === 0) {
    console.log('No git spaces found to monitor');
    return [];
  }
  
  const watchers = [];
  
  for (const gitSpace of gitSpacePaths) {
    console.log(`Starting git space watcher for: ${gitSpace.name} at ${gitSpace.localPath}`);
    
    // Ensure the directory exists
    if (!fs.existsSync(gitSpace.localPath)) {
      console.log(`Git space directory does not exist yet: ${gitSpace.localPath}`);
      // Git spaces are cloned on demand, so we'll create a watcher anyway
      // that will start monitoring once the directory is created
    }
    
    const watcher = chokidar.watch(gitSpace.localPath, WATCH_OPTIONS);
    
    watcher
      .on('add', (filePath, stats) => handleGitFileEvent('add', filePath, stats))
      .on('change', (filePath, stats) => handleGitFileEvent('change', filePath, stats))
      .on('unlink', (filePath) => handleGitFileEvent('unlink', filePath))
      .on('addDir', (filePath, stats) => handleGitFileEvent('addDir', filePath, stats))
      .on('unlinkDir', (filePath) => handleGitFileEvent('unlinkDir', filePath))
      .on('ready', () => {
        console.log(`Git space watcher ready for: ${gitSpace.name}`);
      })
      .on('error', (error) => {
        console.error(`Git space watcher error for ${gitSpace.name}:`, error);
      });
    
    watchers.push({
      spaceName: gitSpace.name,
      watcher: watcher,
      localPath: gitSpace.localPath
    });
  }
  
  return watchers;
}

/**
 * Export run function for worker thread compatibility
 */
async function run() {
  try {
    const watchers = startGitWatchers();
    
    if (watchers.length === 0) {
      console.log('No git space watchers started');
      return;
    }
    
    // Graceful shutdown handler
    const cleanup = () => {
      console.log('Shutting down git space watchers...');
      Promise.all(watchers.map(w => w.watcher.close())).then(() => {
        console.log('Git space watchers shut down gracefully');
        process.exit(0);
      });
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Keep the worker alive
    return new Promise((resolve, reject) => {
      process.on('SIGTERM', () => {
        Promise.all(watchers.map(w => w.watcher.close()))
          .then(resolve)
          .catch(reject);
      });
    });
  } catch (error) {
    console.error('Error starting git space watchers:', error);
    throw error;
  }
}

// Support both direct execution and worker thread
if (require.main === module) {
  run().catch(console.error);
} else {
  module.exports = { run };
}