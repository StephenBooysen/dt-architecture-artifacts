/**
 * @fileoverview File Watcher for Architecture Artifacts Server Sync
 * 
 * This module provides real-time file watching capabilities that monitors
 * local directories for changes and automatically syncs them to the user's
 * personal space on the Architecture Artifacts server.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-05
 */

const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const ApiClient = require('./ApiClient');

class FileWatcher {
  /**
   * Create a file watcher instance
   * @param {Object} config - Configuration object
   * @param {string} config.localPath - Local directory to watch
   * @param {string} config.remotePath - Remote directory path (relative to personal space)
   * @param {ApiClient} config.apiClient - API client instance
   * @param {Object} [config.options] - Watcher options
   */
  constructor(config) {
    this.localPath = path.resolve(config.localPath);
    this.remotePath = config.remotePath || '';
    this.apiClient = config.apiClient;
    this.options = {
      ignoreInitial: false, // Process existing files on startup
      persistent: true,
      ignorePermissionErrors: true,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.DS_Store',
        '**/Thumbs.db',
        '**/*.tmp',
        '**/*.temp',
        '**/.*' // Ignore hidden files/folders
      ],
      ...config.options
    };
    
    this.watcher = null;
    this.isWatching = false;
    this.syncQueue = new Map(); // Track pending sync operations
    this.syncInProgress = false;
    this.stats = {
      filesProcessed: 0,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      errors: 0,
      lastSync: null
    };

    // Debounce timer for batch operations
    this.debounceTimer = null;
    this.debounceDelay = 1000; // 1 second
  }

  /**
   * Log verbose messages
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    console.log(chalk.cyan('[WATCHER]'), ...args);
  }

  /**
   * Log error messages
   * @param {...any} args - Arguments to log
   */
  logError(...args) {
    console.error(chalk.red('[WATCHER ERROR]'), ...args);
  }

  /**
   * Log success messages
   * @param {...any} args - Arguments to log
   */
  logSuccess(...args) {
    console.log(chalk.green('[WATCHER SUCCESS]'), ...args);
  }

  /**
   * Start watching the local directory
   * @returns {Promise<void>}
   */
  async start() {
    try {
      // Verify local path exists
      const exists = await fs.pathExists(this.localPath);
      if (!exists) {
        throw new Error(`Local path does not exist: ${this.localPath}`);
      }

      // Test API connection
      const connected = await this.apiClient.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to the Architecture Artifacts server');
      }

      this.log(`Starting file watcher for: ${this.localPath}`);
      this.log(`Remote path: ${this.remotePath || 'root'}`);
      
      // Create chokidar watcher
      this.watcher = chokidar.watch(this.localPath, this.options);
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isWatching = true;
      this.logSuccess('File watcher started successfully');
      
      // Perform initial sync if not ignoring initial files
      if (!this.options.ignoreInitial) {
        this.log('Performing initial sync...');
        await this.performInitialSync();
      }
      
    } catch (error) {
      this.logError('Failed to start file watcher:', error.message);
      throw error;
    }
  }

  /**
   * Stop watching the local directory
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      if (this.watcher) {
        this.log('Stopping file watcher...');
        await this.watcher.close();
        this.watcher = null;
      }
      
      // Clear any pending debounce
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      
      // Wait for any ongoing sync operations to complete
      while (this.syncInProgress) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.isWatching = false;
      this.logSuccess('File watcher stopped');
      
    } catch (error) {
      this.logError('Error stopping file watcher:', error.message);
      throw error;
    }
  }

  /**
   * Set up event listeners for the file watcher
   */
  setupEventListeners() {
    // File added
    this.watcher.on('add', (filePath) => {
      this.queueFileOperation('add', filePath);
    });

    // File changed
    this.watcher.on('change', (filePath) => {
      this.queueFileOperation('change', filePath);
    });

    // File removed
    this.watcher.on('unlink', (filePath) => {
      this.queueFileOperation('unlink', filePath);
    });

    // Directory added
    this.watcher.on('addDir', (dirPath) => {
      this.queueFileOperation('addDir', dirPath);
    });

    // Directory removed
    this.watcher.on('unlinkDir', (dirPath) => {
      this.queueFileOperation('unlinkDir', dirPath);
    });

    // Error handling
    this.watcher.on('error', (error) => {
      this.logError('Watcher error:', error.message);
      this.stats.errors++;
    });

    // Ready event (initial scan complete)
    this.watcher.on('ready', () => {
      this.log('Initial scan complete, watching for changes...');
    });
  }

  /**
   * Queue a file operation for processing
   * @param {string} operation - Operation type ('add', 'change', 'unlink', etc.)
   * @param {string} filePath - File path
   */
  queueFileOperation(operation, filePath) {
    // Skip if not a text file (for file operations)
    if ((operation === 'add' || operation === 'change') && !this.isTextFile(filePath)) {
      return;
    }

    this.log(`Queued ${operation}: ${filePath}`);
    
    // Add to sync queue
    this.syncQueue.set(filePath, {
      operation,
      timestamp: Date.now(),
      filePath
    });

    // Debounce to batch operations
    this.debouncedSync();
  }

  /**
   * Debounced sync to batch multiple file operations
   */
  debouncedSync() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.processSyncQueue();
    }, this.debounceDelay);
  }

  /**
   * Process all queued sync operations
   */
  async processSyncQueue() {
    if (this.syncInProgress || this.syncQueue.size === 0) {
      return;
    }

    this.syncInProgress = true;
    const operations = Array.from(this.syncQueue.values());
    this.syncQueue.clear();

    this.log(`Processing ${operations.length} queued operations...`);

    for (const op of operations) {
      try {
        await this.processFileOperation(op);
        this.stats.filesProcessed++;
      } catch (error) {
        this.logError(`Failed to process ${op.operation} for ${op.filePath}:`, error.message);
        this.stats.errors++;
      }
    }

    this.stats.lastSync = new Date().toISOString();
    this.syncInProgress = false;
    
    this.logSuccess(`Batch sync completed. Processed: ${operations.length}, Errors: ${this.stats.errors}`);
  }

  /**
   * Process a single file operation
   * @param {Object} operation - Operation object
   */
  async processFileOperation(operation) {
    const { operation: op, filePath } = operation;
    const relativePath = path.relative(this.localPath, filePath);
    const remotePath = this.remotePath ? `${this.remotePath}/${relativePath}` : relativePath;
    const normalizedRemotePath = remotePath.replace(/\\/g, '/');

    switch (op) {
      case 'add':
        this.log(`Creating file: ${normalizedRemotePath}`);
        await this.apiClient.uploadFile(filePath, normalizedRemotePath);
        this.stats.filesCreated++;
        break;

      case 'change':
        this.log(`Updating file: ${normalizedRemotePath}`);
        await this.apiClient.uploadFile(filePath, normalizedRemotePath);
        this.stats.filesUpdated++;
        break;

      case 'unlink':
        this.log(`Deleting file: ${normalizedRemotePath}`);
        try {
          await this.apiClient.deleteFile(normalizedRemotePath);
          this.stats.filesDeleted++;
        } catch (error) {
          // Ignore 404 errors (file already doesn't exist)
          if (error.response && error.response.status === 404) {
            this.log(`File already deleted: ${normalizedRemotePath}`);
          } else {
            throw error;
          }
        }
        break;

      case 'addDir':
        this.log(`Creating directory: ${normalizedRemotePath}`);
        try {
          await this.apiClient.createFolder(normalizedRemotePath);
        } catch (error) {
          // Ignore errors if folder already exists
          if (error.response && error.response.status === 409) {
            this.log(`Directory already exists: ${normalizedRemotePath}`);
          } else {
            throw error;
          }
        }
        break;

      case 'unlinkDir':
        this.log(`Deleting directory: ${normalizedRemotePath}`);
        try {
          await this.apiClient.deleteFolder(normalizedRemotePath);
        } catch (error) {
          // Ignore 404 errors (folder already doesn't exist)
          if (error.response && error.response.status === 404) {
            this.log(`Directory already deleted: ${normalizedRemotePath}`);
          } else {
            throw error;
          }
        }
        break;

      default:
        this.logError(`Unknown operation: ${op}`);
    }
  }

  /**
   * Perform initial directory sync
   */
  async performInitialSync() {
    try {
      const stats = await this.apiClient.syncDirectory(this.localPath, this.remotePath);
      this.stats.filesCreated += stats.created;
      this.stats.filesUpdated += stats.updated;
      this.stats.errors += stats.errors;
      this.stats.lastSync = new Date().toISOString();
      
      this.logSuccess(`Initial sync completed. Created: ${stats.created}, Updated: ${stats.updated}, Errors: ${stats.errors}`);
    } catch (error) {
      this.logError('Initial sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if a file is a text file that should be synced
   * @param {string} filePath - File path
   * @returns {boolean} True if file should be synced
   */
  isTextFile(filePath) {
    return this.apiClient.isTextFile(path.basename(filePath));
  }

  /**
   * Get current watcher statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      isWatching: this.isWatching,
      queueSize: this.syncQueue.size,
      syncInProgress: this.syncInProgress,
      localPath: this.localPath,
      remotePath: this.remotePath
    };
  }

  /**
   * Print current statistics to console
   */
  printStats() {
    const stats = this.getStats();
    
    console.log(chalk.cyan('\n=== File Watcher Statistics ==='));
    console.log(`Local Path: ${stats.localPath}`);
    console.log(`Remote Path: ${stats.remotePath || 'root'}`);
    console.log(`Status: ${stats.isWatching ? chalk.green('Running') : chalk.red('Stopped')}`);
    console.log(`Files Processed: ${stats.filesProcessed}`);
    console.log(`Files Created: ${stats.filesCreated}`);
    console.log(`Files Updated: ${stats.filesUpdated}`);
    console.log(`Files Deleted: ${stats.filesDeleted}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Queue Size: ${stats.queueSize}`);
    console.log(`Sync In Progress: ${stats.syncInProgress ? 'Yes' : 'No'}`);
    console.log(`Last Sync: ${stats.lastSync || 'Never'}`);
    console.log(chalk.cyan('==============================\n'));
  }
}

module.exports = FileWatcher;