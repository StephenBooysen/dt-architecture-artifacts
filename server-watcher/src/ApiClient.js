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

    this.personalSpace = 'Personal'; // Fixed personal space name
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
    try {
      this.log(`Getting file tree for ${this.personalSpace} space...`);
      const response = await this.client.get(`/${this.personalSpace}/folders`);
      this.log('File tree retrieved successfully');
      return response.data;
    } catch (error) {
      this.logError('Failed to get file tree:', error.message);
      throw error;
    }
  }

  /**
   * Check if a file exists in the personal space
   * @param {string} filePath - Relative path to the file
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    try {
      this.log(`Checking if file exists: ${filePath}`);
      await this.client.get(`/${this.personalSpace}/files/${filePath}`);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file content from the personal space
   * @param {string} filePath - Relative path to the file
   * @returns {Promise<string>} File content
   */
  async getFileContent(filePath) {
    try {
      this.log(`Getting content for file: ${filePath}`);
      const response = await this.client.get(`/${this.personalSpace}/files/${filePath}`);
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
    try {
      this.log(`Creating file: ${filePath}`);
      await this.client.post(`/${this.personalSpace}/files/${filePath}`, {
        content: content
      });
      this.logSuccess(`File created: ${filePath}`);
    } catch (error) {
      this.logError(`Failed to create file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Update an existing file in the personal space
   * @param {string} filePath - Relative path to the file
   * @param {string} content - New file content
   * @returns {Promise<void>}
   */
  async updateFile(filePath, content) {
    try {
      this.log(`Updating file: ${filePath}`);
      await this.client.put(`/${this.personalSpace}/files/${filePath}`, {
        content: content
      });
      this.logSuccess(`File updated: ${filePath}`);
    } catch (error) {
      this.logError(`Failed to update file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a file from the personal space
   * @param {string} filePath - Relative path to the file
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    try {
      this.log(`Deleting file: ${filePath}`);
      await this.client.delete(`/${this.personalSpace}/files/${filePath}`);
      this.logSuccess(`File deleted: ${filePath}`);
    } catch (error) {
      this.logError(`Failed to delete file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Create a folder in the personal space
   * @param {string} folderPath - Relative path to the folder
   * @returns {Promise<void>}
   */
  async createFolder(folderPath) {
    try {
      this.log(`Creating folder: ${folderPath}`);
      await this.client.post(`/${this.personalSpace}/folders`, {
        folderPath: folderPath
      });
      this.logSuccess(`Folder created: ${folderPath}`);
    } catch (error) {
      this.logError(`Failed to create folder ${folderPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a folder from the personal space
   * @param {string} folderPath - Relative path to the folder
   * @returns {Promise<void>}
   */
  async deleteFolder(folderPath) {
    try {
      this.log(`Deleting folder: ${folderPath}`);
      await this.client.delete(`/${this.personalSpace}/folders/${folderPath}`);
      this.logSuccess(`Folder deleted: ${folderPath}`);
    } catch (error) {
      this.logError(`Failed to delete folder ${folderPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Upload a local file to the personal space
   * @param {string} localFilePath - Path to the local file
   * @param {string} remoteFilePath - Relative path in the personal space
   * @returns {Promise<void>}
   */
  async uploadFile(localFilePath, remoteFilePath) {
    try {
      this.log(`Uploading ${localFilePath} to ${remoteFilePath}`);
      
      // Read the local file
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
      
      this.logSuccess(`Upload completed: ${localFilePath} -> ${remoteFilePath}`);
    } catch (error) {
      this.logError(`Failed to upload file ${localFilePath}:`, error.message);
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
   * Check if a file is likely a text file that should be synced
   * @param {string} filename - File name
   * @returns {boolean} True if file should be synced
   */
  isTextFile(filename) {
    const textExtensions = [
      '.md', '.txt', '.json', '.js', '.ts', '.jsx', '.tsx',
      '.css', '.scss', '.html', '.xml', '.yml', '.yaml',
      '.py', '.java', '.c', '.cpp', '.h', '.php', '.rb',
      '.go', '.rs', '.sh', '.bat', '.ps1', '.sql'
    ];
    
    const ext = path.extname(filename).toLowerCase();
    return textExtensions.includes(ext);
  }
}

module.exports = ApiClient;