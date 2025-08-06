/**
 * @fileoverview API Client for Architecture Artifacts Server Communication
 * 
 * This module provides a comprehensive API client for communicating with the
 * Architecture Artifacts server. It handles authentication via API keys and
 * provides methods for file operations in the user's personal space.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-05
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class ApiClient {
  /**
   * Create an API client instance
   * @param {Object} config - Configuration object
   * @param {string} config.serverUrl - Base URL of the Architecture Artifacts server
   * @param {string} config.apiKey - API key for authentication
   * @param {string} config.username - Username for the personal space
   * @param {boolean} [config.verbose=false] - Enable verbose logging
   */
  constructor(config) {
    this.serverUrl = config.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.verbose = config.verbose || false;
    
    // Retry configuration for operations
    this.retryConfig = config.operationRetry || {
      maxRetries: 3,
      retryDelay: 2000,
      backoffMultiplier: 1.5
    };
    
    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: `${this.serverUrl}/api`,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logError('API Request failed:', error.message);
        if (error.response) {
          this.logError('Response status:', error.response.status);
          this.logError('Response data:', error.response.data);
        }
        return Promise.reject(error);
      }
    );

    // Use space-specific endpoints to ensure files go to the correct space
    this.useLegacyEndpoints = false;
    this.personalSpace = 'Personal';
  }

  /**
   * Log verbose messages
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    if (this.verbose) {
      console.log(chalk.blue('[API]'), ...args);
    }
  }

  /**
   * Log error messages
   * @param {...any} args - Arguments to log
   */
  logError(...args) {
    console.error(chalk.red('[API ERROR]'), ...args);
  }

  /**
   * Log success messages
   * @param {...any} args - Arguments to log
   */
  logSuccess(...args) {
    console.log(chalk.green('[API SUCCESS]'), ...args);
  }

  /**
   * Check if an error is retriable (server restart, network issues, etc.)
   * @param {Error} error - The error to check
   * @returns {boolean} True if the error is retriable
   */
  isRetriableError(error) {
    // Check for common retriable errors
    const retriableMessages = [
      'socket hang up',
      'ECONNRESET',
      'ECONNREFUSED', 
      'ENOTFOUND',
      'ETIMEDOUT',
      'Empty reply from server'
    ];
    
    // Check error message
    if (error.message && retriableMessages.some(msg => error.message.includes(msg))) {
      return true;
    }
    
    // Check for HTTP status codes that might be retriable
    if (error.response) {
      const status = error.response.status;
      // 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
      if (status === 502 || status === 503 || status === 504) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Execute an API operation with retry logic
   * @param {Function} operation - The async operation to retry
   * @param {string} operationName - Name of the operation for logging
   * @param {Object} options - Retry options
   * @returns {Promise<any>} The result of the operation
   */
  async withRetry(operation, operationName, options = {}) {
    const {
      maxRetries = this.retryConfig.maxRetries,
      retryDelay = this.retryConfig.retryDelay,
      backoffMultiplier = this.retryConfig.backoffMultiplier
    } = options;

    let lastError = null;
    let delay = retryDelay;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        if (attempt > 1) {
          this.log(`Retrying ${operationName} (attempt ${attempt}/${maxRetries + 1})...`);
        }
        
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt <= maxRetries && this.isRetriableError(error)) {
          this.log(`${operationName} failed (attempt ${attempt}), retrying in ${delay}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * backoffMultiplier, 10000); // Cap at 10 seconds
        } else {
          // Either max retries reached or non-retriable error
          if (this.isRetriableError(error) && attempt > maxRetries) {
            this.logError(`${operationName} failed after ${maxRetries + 1} attempts:`, error.message);
          }
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Test the connection to the server
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      this.log('Testing connection to server...');
      const response = await this.client.get('/server/status');
      this.logSuccess('Connection test successful');
      return true;
    } catch (error) {
      this.logError('Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get the file tree for the personal space
   * @returns {Promise<Array>} File tree structure
   */
  async getFileTree() {
    return this.withRetry(async () => {
      this.log('Getting file tree...');
      // Try the legacy files endpoint as the space-specific one has issues
      const response = await this.client.get('/files');
      this.log('File tree retrieved successfully');
      return response.data;
    }, 'Get file tree');
  }

  /**
   * Check if a file exists in the personal space  
   * @param {string} filePath - Relative path to the file
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    return this.withRetry(async () => {
      this.log(`Checking if file exists: ${filePath}`);
      try {
        await this.client.get(`/${this.personalSpace}/files/${encodeURIComponent(filePath)}`);
        return true;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          return false;
        }
        throw error;
      }
    }, `Check file exists ${filePath}`);
  }

  /**
   * Get file content from the personal space
   * @param {string} filePath - Relative path to the file
   * @returns {Promise<string>} File content
   */
  async getFileContent(filePath) {
    try {
      this.log(`Getting content for file: ${filePath}`);
      const response = await this.client.get(`/files/${encodeURIComponent(filePath)}`);
      return response.data.content || response.data.cleanContent || '';
    } catch (error) {
      this.logError(`Failed to get file content for ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new file in the personal space
   * @param {string} filePath - Relative path to the file
   * @param {string} content - File content
   * @returns {Promise<void>}
   */
  async createFile(filePath, content) {
    return this.withRetry(async () => {
      this.log(`Creating file: ${filePath}`);
      await this.client.post(`/${this.personalSpace}/files`, {
        filePath: filePath,
        content: content
      });
      this.logSuccess(`File created: ${filePath}`);
    }, `Create file ${filePath}`);
  }

  /**
   * Update an existing file in the personal space
   * @param {string} filePath - Relative path to the file
   * @param {string} content - New file content
   * @returns {Promise<void>}
   */
  async updateFile(filePath, content) {
    return this.withRetry(async () => {
      this.log(`Updating file: ${filePath}`);
      await this.client.put(`/${this.personalSpace}/files/${encodeURIComponent(filePath)}`, {
        content: content
      });
      this.logSuccess(`File updated: ${filePath}`);
    }, `Update file ${filePath}`);
  }

  /**
   * Delete a file from the personal space
   * @param {string} filePath - Relative path to the file
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    return this.withRetry(async () => {
      this.log(`Deleting file: ${filePath}`);
      await this.client.delete(`/${this.personalSpace}/files/${encodeURIComponent(filePath)}`);
      this.logSuccess(`File deleted: ${filePath}`);
    }, `Delete file ${filePath}`);
  }

  /**
   * Create a folder in the personal space
   * @param {string} folderPath - Relative path to the folder
   * @returns {Promise<void>}
   */
  async createFolder(folderPath) {
    return this.withRetry(async () => {
      this.log(`Creating folder: ${folderPath}`);
      await this.client.post(`/${this.personalSpace}/folders`, {
        folderPath: folderPath
      });
      this.logSuccess(`Folder created: ${folderPath}`);
    }, `Create folder ${folderPath}`);
  }

  /**
   * Delete a folder from the personal space
   * @param {string} folderPath - Relative path to the folder
   * @returns {Promise<void>}
   */
  async deleteFolder(folderPath) {
    return this.withRetry(async () => {
      this.log(`Deleting folder: ${folderPath}`);
      await this.client.delete(`/${this.personalSpace}/folders/${encodeURIComponent(folderPath)}`);
      this.logSuccess(`Folder deleted: ${folderPath}`);
    }, `Delete folder ${folderPath}`);
  }

  /**
   * Upload a local file to the personal space
   * @param {string} localFilePath - Path to the local file
   * @param {string} remoteFilePath - Relative path in the personal space
   * @returns {Promise<void>}
   */
  async uploadFile(localFilePath, remoteFilePath) {
    return this.withRetry(async () => {
      this.log(`Uploading ${localFilePath} to ${remoteFilePath}`);
      
      // Determine if this is a text or binary file
      const isTextFile = this.isTextualFile(path.basename(localFilePath));
      
      if (isTextFile) {
        // Handle text files using the JSON API
        const content = await fs.readFile(localFilePath, 'utf8');
        
        // Check if the remote file already exists
        const exists = await this.fileExists(remoteFilePath);
        
        if (exists) {
          // Update existing file
          await this.updateFile(remoteFilePath, content);
        } else {
          // Create new file
          await this.createFile(remoteFilePath, content);
        }
      } else {
        // Handle binary files using the multipart upload API
        await this.uploadBinaryFile(localFilePath, remoteFilePath);
      }
      
      this.logSuccess(`Upload completed: ${localFilePath} -> ${remoteFilePath}`);
    }, `Upload file ${localFilePath}`);
  }

  /**
   * Upload a binary file by encoding it as base64 text content
   * @param {string} localFilePath - Path to the local file
   * @param {string} remoteFilePath - Relative path in the personal space
   * @returns {Promise<void>}
   */
  async uploadBinaryFile(localFilePath, remoteFilePath) {
    try {
      // Read binary file and encode as base64
      const buffer = await fs.readFile(localFilePath);
      const base64Content = buffer.toString('base64');
      const mimeType = this.getMimeType(localFilePath);
      
      // Create a data URL format that can be stored as text
      const content = `data:${mimeType};base64,${base64Content}`;
      
      // Check if the remote file already exists
      const exists = await this.fileExists(remoteFilePath);
      
      if (exists) {
        // Update existing file
        await this.updateFile(remoteFilePath, content);
      } else {
        // Create new file
        await this.createFile(remoteFilePath, content);
      }
      
      this.log(`Binary file uploaded successfully: ${remoteFilePath}`);
    } catch (error) {
      this.logError(`Failed to upload binary file ${localFilePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Download a file from the personal space to local filesystem
   * @param {string} remoteFilePath - Relative path in the personal space
   * @param {string} localFilePath - Local path to save the file
   * @returns {Promise<void>}
   */
  async downloadFile(remoteFilePath, localFilePath) {
    try {
      this.log(`Downloading ${remoteFilePath} to ${localFilePath}`);
      
      // Get the remote file content
      const content = await this.getFileContent(remoteFilePath);
      
      // Ensure the local directory exists
      await fs.ensureDir(path.dirname(localFilePath));
      
      // Write the content to the local file
      await fs.writeFile(localFilePath, content, 'utf8');
      
      this.logSuccess(`Download completed: ${remoteFilePath} -> ${localFilePath}`);
    } catch (error) {
      this.logError(`Failed to download file ${remoteFilePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Sync a local directory to the personal space
   * @param {string} localDir - Local directory path
   * @param {string} remoteDir - Remote directory path (relative to personal space)
   * @param {Object} options - Sync options
   * @param {boolean} [options.dryRun=false] - Only log what would be done
   * @returns {Promise<Object>} Sync statistics
   */
  async syncDirectory(localDir, remoteDir = '', options = {}) {
    const { dryRun = false } = options;
    const stats = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0
    };

    try {
      this.log(`Starting directory sync: ${localDir} -> ${remoteDir || 'root'}`);
      
      if (dryRun) {
        this.log(chalk.yellow('DRY RUN MODE - No changes will be made'));
      }

      // Get all files in the local directory
      const localFiles = await this.getLocalFiles(localDir);
      
      for (const localFile of localFiles) {
        try {
          const relativePath = path.relative(localDir, localFile);
          const remotePath = remoteDir ? `${remoteDir}/${relativePath}` : relativePath;
          
          // Convert backslashes to forward slashes for consistency
          const normalizedRemotePath = remotePath.replace(/\\/g, '/');
          
          if (dryRun) {
            this.log(`Would sync: ${localFile} -> ${normalizedRemotePath}`);
          } else {
            await this.uploadFile(localFile, normalizedRemotePath);
            
            // Check if this is a new file or an update
            const exists = await this.fileExists(normalizedRemotePath);
            if (exists) {
              stats.updated++;
            } else {
              stats.created++;
            }
          }
        } catch (error) {
          stats.errors++;
          this.logError(`Failed to sync file ${localFile}:`, error.message);
        }
      }

      this.logSuccess(`Directory sync completed. Created: ${stats.created}, Updated: ${stats.updated}, Errors: ${stats.errors}`);
      return stats;

    } catch (error) {
      this.logError('Directory sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Get all files in a local directory recursively
   * @param {string} dir - Directory path
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async getLocalFiles(dir) {
    const files = [];
    
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Skip hidden directories and node_modules
        if (!item.name.startsWith('.') && item.name !== 'node_modules') {
          const subFiles = await this.getLocalFiles(fullPath);
          files.push(...subFiles);
        }
      } else if (item.isFile()) {
        // Skip hidden files and common non-text files
        if (!item.name.startsWith('.') && this.isTextFile(item.name)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  /**
   * Check if a file should be synced (text files and common binary formats)
   * @param {string} filename - File name
   * @returns {boolean} True if file should be synced
   */
  isTextFile(filename) {
    const allowedExtensions = [
      // Text files
      '.md', '.txt', '.json', '.js', '.ts', '.jsx', '.tsx',
      '.css', '.scss', '.html', '.xml', '.yml', '.yaml',
      '.py', '.java', '.c', '.cpp', '.h', '.php', '.rb',
      '.go', '.rs', '.sh', '.bat', '.ps1', '.sql',
      // Image files
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp',
      // Document files
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      // Other common formats
      '.zip', '.tar', '.gz', '.7z'
    ];
    
    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
  }

  /**
   * Check if a file is a text file (as opposed to binary)
   * @param {string} filename - File name
   * @returns {boolean} True if file is textual
   */
  isTextualFile(filename) {
    const textExtensions = [
      '.md', '.txt', '.json', '.js', '.ts', '.jsx', '.tsx',
      '.css', '.scss', '.html', '.xml', '.yml', '.yaml',
      '.py', '.java', '.c', '.cpp', '.h', '.php', '.rb',
      '.go', '.rs', '.sh', '.bat', '.ps1', '.sql', '.svg'
    ];
    
    const ext = path.extname(filename).toLowerCase();
    return textExtensions.includes(ext);
  }

  /**
   * Get MIME type for a file based on extension
   * @param {string} filename - File name
   * @returns {string} MIME type
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.7z': 'application/x-7z-compressed'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = ApiClient;