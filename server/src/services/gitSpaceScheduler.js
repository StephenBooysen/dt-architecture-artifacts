/**
 * @fileoverview Git Space Scheduler
 * 
 * This service periodically syncs git-based spaces to cache and search services.
 * It runs in the background and handles all git operations server-side.
 */

const path = require('path');
const { getSpaceConfigs } = require('../config/spaces');
const { getFilingProviderForSpace } = require('../routes/spaces');

// Import service singletons
const cacheInstance = require('./caching/singleton');
const searchInstance = require('./searching/singleton');

class GitSpaceScheduler {
  constructor() {
    this.syncIntervalId = null;
    this.isRunning = false;
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('GitSpaceScheduler already running');
      return;
    }

    console.log('Starting GitSpaceScheduler...');
    this.isRunning = true;
    
    // Run initial sync
    this.syncAllSpaces();
    
    // Set up periodic sync
    this.syncIntervalId = setInterval(() => {
      this.syncAllSpaces();
    }, this.syncInterval);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping GitSpaceScheduler...');
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Sync all spaces (git and local)
   */
  async syncAllSpaces() {
    try {
      console.log('GitSpaceScheduler: Starting sync cycle...');
      const spaceConfigs = getSpaceConfigs();
      console.log('GitSpaceScheduler: Found space configs:', Object.keys(spaceConfigs));
      
      for (const [spaceName, config] of Object.entries(spaceConfigs)) {
        // Sync all spaces that have filing providers
        if (config.filing && (config.filing.type === 'git' || config.filing.type === 'local')) {
          console.log(`Syncing ${config.filing.type} space: ${spaceName}`);
          await this.syncGitSpace(spaceName, config);
        } else {
          console.log(`Skipping space without filing provider: ${spaceName} (type: ${config.filing?.type})`);
        }
      }
      console.log('GitSpaceScheduler: Sync cycle completed');
    } catch (error) {
      console.error('Error syncing spaces:', error);
    }
  }

  /**
   * Sync a single space (git or local)
   */
  async syncGitSpace(spaceName, config) {
    try {
      // Skip Personal space - it needs user-specific context
      if (spaceName === 'Personal') {
        console.log(`Skipping Personal space - requires user-specific context`);
        return;
      }
      
      // Get the filing provider for this space
      const filing = await getFilingProviderForSpace(spaceName, null); // No user context for scheduler
      
      if (!filing) {
        console.error(`No filing provider found for space: ${spaceName}`);
        return;
      }

      // Get the directory tree from filing provider
      const isReadonly = config.access === 'readonly';
      console.log(`GitSpaceScheduler: Getting directory tree for ${spaceName} (readonly: ${isReadonly})`);
      const tree = await this.getDirectoryTreeFromFiling(filing, '', isReadonly);
      
      // Cache the tree data
      const cacheKey = `space:${spaceName}:tree`;
      await this.setCacheValue(cacheKey, {
        tree: tree,
        syncedAt: new Date().toISOString(),
        spaceName: spaceName
      });

      // Update search service with file content
      await this.updateSearchService(filing, tree, spaceName, isReadonly);

      console.log(`Successfully synced space: ${spaceName} (${tree.length} items)`);
    } catch (error) {
      console.error(`Error syncing space ${spaceName}:`, error.message);
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Get directory tree from filing provider (copied from spaces/index.js but with draft detection)
   */
  async getDirectoryTreeFromFiling(filing, relativePath = '', isReadonly = false) {
    const basePath = isReadonly 
      ? (relativePath || '') 
      : (relativePath ? `markdown/${relativePath}` : 'markdown');
    
    let items;
    try {
      items = await filing.listDetailed(basePath);
      if (!Array.isArray(items)) {
        console.warn(`listDetailed returned non-array for ${basePath}:`, items);
        return [];
      }
    } catch (error) {
      console.warn(`Error listing directory ${basePath}:`, error.message);
      return [];
    }
    
    const tree = [];

    // Get draft files if the filing provider supports it
    let draftFiles = [];
    if (filing.getDraftFiles && typeof filing.getDraftFiles === 'function') {
      try {
        draftFiles = await filing.getDraftFiles();
      } catch (error) {
        console.warn('Failed to get draft files:', error);
        draftFiles = [];
      }
    }

    for (const item of items) {
      // Skip hidden files and folders (starting with .)
      if (item.name.startsWith('.')) {
        continue;
      }

      const relPath = relativePath ? path.join(relativePath, item.name) : item.name;

      if (item.isDirectory) {
        const children = await this.getDirectoryTreeFromFiling(filing, relPath, isReadonly);
        tree.push({
          name: item.name,
          type: 'directory',
          path: relPath,
          children,
        });
      } else {
        // Include all files, not just markdown
        const fileType = this.detectFileType(item.name);
        
        // Check if this file is a draft
        const spacePath = isReadonly ? relPath : `markdown/${relPath}`;
        const isDraft = draftFiles.includes(spacePath) || (item.isDraft === true);
        
        tree.push({
          name: item.name,
          type: 'file',
          path: relPath,
          fileType: fileType,
          isDraft: isDraft,
        });
      }
    }

    return tree.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Detect file type from extension
   */
  detectFileType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(ext)) {
      return 'image';
    } else if (ext === '.pdf') {
      return 'pdf';
    } else if (['.txt', '.json', '.xml', '.csv', '.log', '.js', '.ts', '.css', '.html'].includes(ext)) {
      return 'text';
    } else if (['.md', '.markdown'].includes(ext)) {
      return 'markdown';
    }
    
    return 'unknown';
  }

  /**
   * Update search service with file content
   */
  async updateSearchService(filing, tree, spaceName, isReadonly) {
    try {
      // Recursively process all files in the tree
      const processFiles = async (items, pathPrefix = '') => {
        for (const item of items) {
          if (item.type === 'directory' && item.children) {
            await processFiles(item.children, pathPrefix);
          } else if (item.type === 'file' && item.fileType === 'markdown') {
            try {
              // Read file content
              const fullPath = isReadonly ? item.path : `markdown/${item.path}`;
              const content = await filing.read(fullPath, 'utf8');
              
              // Add to search service
              const searchKey = `${spaceName}:${item.path}`;
              const searchData = {
                spaceName: spaceName,
                filePath: item.path,
                fileName: item.name,
                content: content,
                fileType: item.fileType,
                isDraft: item.isDraft || false,
                indexedAt: new Date().toISOString()
              };
              
              await this.addToSearchService(searchKey, searchData);
            } catch (error) {
              console.warn(`Failed to index file ${item.path}:`, error.message);
            }
          }
        }
      };

      await processFiles(tree);
    } catch (error) {
      console.error(`Error updating search service for space ${spaceName}:`, error);
    }
  }

  /**
   * Set value in cache service
   */
  async setCacheValue(key, value) {
    try {
      await cacheInstance.put(key, value);
      console.log(`Successfully cached key: ${key}`);
    } catch (error) {
      console.warn(`Error caching key ${key}:`, error.message);
    }
  }

  /**
   * Add data to search service
   */
  async addToSearchService(key, data) {
    try {
      await searchInstance.add(key, data);
      console.log(`Successfully indexed search data for key: ${key}`);
    } catch (error) {
      console.warn(`Error adding search data for key ${key}:`, error.message);
    }
  }

  /**
   * Sync Personal space for a specific user
   */
  async syncPersonalSpaceForUser(username) {
    try {
      console.log(`GitSpaceScheduler: Syncing Personal space for user: ${username}`);
      
      // Get the filing provider for Personal space
      const filing = await getFilingProviderForSpace('Personal');
      
      if (!filing) {
        console.error(`No filing provider found for Personal space`);
        return;
      }

      // Set user context for Personal space
      if (filing.setUserContext && typeof filing.setUserContext === 'function') {
        filing.setUserContext({ username }, 'Personal');
      }

      // Get the directory tree from filing provider
      console.log(`GitSpaceScheduler: Getting directory tree for Personal space (user: ${username})`);
      const tree = await this.getDirectoryTreeFromFiling(filing, '', false); // Personal is not readonly
      
      // Cache the tree data with user-specific key
      const cacheKey = `personal:${username}:tree`;
      await this.setCacheValue(cacheKey, {
        tree: tree,
        syncedAt: new Date().toISOString(),
        spaceName: 'Personal',
        username: username
      });

      // Update search service with file content
      await this.updateSearchService(filing, tree, `Personal:${username}`, false);

      console.log(`Successfully synced Personal space for user: ${username} (${tree.length} items)`);
      return tree;
    } catch (error) {
      console.error(`Error syncing Personal space for user ${username}:`, error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
}

// Export singleton instance
const gitSpaceScheduler = new GitSpaceScheduler();
module.exports = gitSpaceScheduler;