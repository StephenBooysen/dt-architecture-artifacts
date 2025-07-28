/**
 * @fileoverview Express server for Architecture Artifacts application.
 * 
 * This server provides a REST API for managing markdown files, folders, and Git operations
 * in a content management system. It includes features for file upload, download, editing,
 * and comprehensive Git integration with monitoring capabilities.
 * 
 * Key features:
 * - File and folder CRUD operations
 * - Git integration (commit, push, pull, clone, status)
 * - File upload with security validation
 * - API call monitoring and dashboard
 * - Security middleware (helmet, rate limiting)
 * - Path traversal protection
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const simpleGit = require('simple-git');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const EventEmitter = require('events');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const git = simpleGit();

/** @type {Array<Object>} Array to store API call logs for monitoring */
const apiCalls = [];

/** @const {number} Maximum number of API calls to keep in memory */
const MAX_API_CALLS = 1000;

/**
 * Middleware to log API calls for monitoring purposes.
 * 
 * This middleware intercepts all API requests and responses to collect
 * performance and usage metrics. It captures request details, response
 * metadata, and timing information.
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object  
 * @param {express.NextFunction} next - Express next middleware function
 */
function logApiCall(req, res, next) {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override res.end to capture response details
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log the API call
    const apiCall = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      statusCode: res.statusCode,
      duration: duration,
      responseSize: chunk ? Buffer.byteLength(chunk) : 0,
      requestBody: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : null
    };
    
    // Add to beginning of array and trim if needed
    apiCalls.unshift(apiCall);
    if (apiCalls.length > MAX_API_CALLS) {
      apiCalls.pop();
    }
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

app.use(helmet());
app.use(cors());
app.use(express.json());

/**
 * Patch our emitter to capture all events
 * @param {} emitter
 */
function patchEmitter(emitter) {
  const originalEmit = emitter.emit;

  emitter.emit = function () {
    const eventName = arguments[0];
    const args = Array.from(arguments).slice(1); // Get arguments excluding the event name

    console.log(`Caught event: "${eventName}" with arguments:`, args);

    // Call the original emit method to ensure normal event handling continues
    return originalEmit.apply(this, arguments);
  };
}
const eventEmitter = new EventEmitter();
patchEmitter(eventEmitter);

// lets cache
const cache = require('./services/caching')(
  'memory',
  { 'express-app': app },
  eventEmitter,
);
cache.put('currentdate', new Date());

const log = require('./services/logging')('', { 'express-app': app }, eventEmitter);
cache.get('currentdate').then((value) => log.log(value));

// Apply API call logging to all API routes
app.use('/api', logApiCall);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

/** @const {string} Path to the content directory where files are stored */
const contentDir = path.join(__dirname, '../content');

/**
 * Configure multer storage for file uploads.
 * Files are temporarily stored in the content directory before being moved
 * to their final destination based on folder path.
 */
const storage = multer.diskStorage({
  /**
   * Determines the destination directory for uploaded files.
   * @param {express.Request} req - Express request object
   * @param {Object} file - Multer file object
   * @param {Function} cb - Callback function
   */
  destination: (req, file, cb) => {
    // Store temporarily in the content directory
    cb(null, contentDir);
  },
  
  /**
   * Determines the filename for uploaded files.
   * Sanitizes the original filename to prevent security issues.
   * @param {express.Request} req - Express request object
   * @param {Object} file - Multer file object
   * @param {Function} cb - Callback function
   */
  filename: (req, file, cb) => {
    // Use original filename, but sanitize it
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, sanitizedName);
  }
});

/**
 * Multer instance configured for file uploads.
 * Includes file size limits and filtering for security.
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  /**
   * File filter function to validate uploaded files.
   * @param {express.Request} req - Express request object
   * @param {Object} file - Multer file object
   * @param {Function} cb - Callback function
   */
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  }
});

/**
 * Ensures the content directory exists, creating it if necessary.
 * 
 * This function checks if the content directory exists and creates it
 * recursively if it doesn't exist. It's used to ensure the storage
 * location is available before performing file operations.
 * 
 * @return {Promise<void>} Promise that resolves when directory exists
 * @throws {Error} If directory creation fails due to permissions or other issues
 */
async function ensureContentDir() {
  try {
    await fs.access(contentDir);
  } catch {
    await fs.mkdir(contentDir, {recursive: true});
  }
}

/**
 * Detects file type based on file extension.
 * 
 * Analyzes the file extension to categorize files into types for
 * appropriate handling and display. Used throughout the application
 * to determine how files should be processed and displayed.
 * 
 * @param {string} fileName - The complete filename including extension
 * @return {string} File type category: 'markdown', 'pdf', 'image', 'text', or 'unknown'
 */
function detectFileType(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const textExtensions = ['.txt', '.json', '.xml', '.csv', '.log', '.js', '.ts', '.css', '.html'];
  const pdfExtensions = ['.pdf'];
  const markdownExtensions = ['.md', '.markdown'];
  
  if (markdownExtensions.includes(extension)) return 'markdown';
  if (pdfExtensions.includes(extension)) return 'pdf';
  if (imageExtensions.includes(extension)) return 'image';
  if (textExtensions.includes(extension)) return 'text';
  
  return 'unknown';
}

/**
 * Recursively builds a directory tree structure for all files.
 * @param {string} dirPath - The directory path to scan.
 * @param {string} relativePath - The relative path from the content root.
 * @return {Promise<Array>} The directory tree structure.
 */
async function getDirectoryTree(dirPath, relativePath = '') {
  const items = await fs.readdir(dirPath, {withFileTypes: true});
  const tree = [];

  for (const item of items) {
    // Skip hidden files and folders (starting with .)
    if (item.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dirPath, item.name);
    const relPath = path.join(relativePath, item.name);

    if (item.isDirectory()) {
      const children = await getDirectoryTree(fullPath, relPath);
      tree.push({
        name: item.name,
        type: 'directory',
        path: relPath,
        children,
      });
    } else {
      // Include all files, not just markdown
      const fileType = detectFileType(item.name);
      tree.push({
        name: item.name,
        type: 'file',
        path: relPath,
        fileType: fileType,
      });
    }
  }

  return tree.sort((a, b) => {
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

// Create new folder - must come before wildcard routes
app.post('/api/folders', async (req, res) => {
  try {
    const {folderPath} = req.body;
    
    if (!folderPath) {
      return res.status(400).json({error: 'Folder path is required'});
    }

    // Ensure content directory exists
    await ensureContentDir();
    
    const fullPath = path.join(contentDir, folderPath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    await fs.mkdir(fullPath, {recursive: true});
    res.json({message: 'Folder created successfully', path: folderPath});
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({error: 'Failed to create folder'});
  }
});

// Create new file - must come before wildcard routes
app.post('/api/files', async (req, res) => {
  try {
    const {filePath, content = ''} = req.body;
    
    if (!filePath) {
      return res.status(400).json({error: 'File path is required'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Only markdown files (.md) are allowed'});
    }

    // Ensure content directory exists
    await ensureContentDir();
    
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    // Check if file already exists
    try {
      await fs.access(fullPath);
      return res.status(409).json({error: 'File already exists'});
    } catch {
      // File doesn't exist, continue with creation
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), {recursive: true});
    await fs.writeFile(fullPath, content, 'utf8');
    
    res.json({message: 'File created successfully', path: filePath});
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({error: 'Failed to create file'});
  }
});

app.get('/api/files', async (req, res) => {
  try {
    await ensureContentDir();
    const tree = await getDirectoryTree(contentDir);
    res.json(tree);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({error: 'Failed to get files'});
  }
});

app.get('/api/files/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    const fileName = path.basename(filePath);
    const fileType = detectFileType(fileName);
    
    // Handle different file types
    if (fileType === 'markdown' || fileType === 'text') {
      // Read as text
      const content = await fs.readFile(fullPath, 'utf8');
      res.json({content, path: filePath, fileType});
    } else if (fileType === 'image' || fileType === 'pdf') {
      // Read as binary and convert to base64
      const buffer = await fs.readFile(fullPath);
      const base64Content = buffer.toString('base64');
      res.json({content: base64Content, path: filePath, fileType, encoding: 'base64'});
    } else {
      // Unknown file type - return file info for download
      const stats = await fs.stat(fullPath);
      res.json({
        path: filePath,
        fileType,
        size: stats.size,
        downloadable: true
      });
    }
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(404).json({error: 'File not found'});
  }
});

// Download endpoint for files
app.get('/api/download/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    const fileName = path.basename(filePath);
    const stats = await fs.stat(fullPath);
    
    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size);
    
    // Determine content type based on extension
    const extension = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.log': 'text/plain',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.md': 'text/markdown',
      '.markdown': 'text/markdown'
    };
    
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Stream the file
    const fileStream = await fs.readFile(fullPath);
    res.send(fileStream);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(404).json({error: 'File not found'});
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folderPath = req.body.folderPath || '';
    const tempFilePath = req.file.path; // Current location of uploaded file
    const finalFilePath = path.join(folderPath, req.file.filename);
    const finalFullPath = path.join(contentDir, finalFilePath);
    
    console.log('Folder path from request:', folderPath);
    console.log('Temp file path:', tempFilePath);
    console.log('Final file path:', finalFilePath);
    console.log('Final full path:', finalFullPath);
    
    // Validate that the final path is within the content directory
    if (!finalFullPath.startsWith(contentDir)) {
      // Clean up temp file
      await fs.unlink(tempFilePath);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create the target directory if it doesn't exist
    const targetDir = path.dirname(finalFullPath);
    await fs.mkdir(targetDir, { recursive: true });
    
    // Move the file to the correct location
    if (tempFilePath !== finalFullPath) {
      await fs.rename(tempFilePath, finalFullPath);
    }

    res.json({
      message: 'File uploaded successfully',
      filePath: finalFilePath,
      fileName: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up temp file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.post('/api/files/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const {content} = req.body;
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    await fs.mkdir(path.dirname(fullPath), {recursive: true});
    await fs.writeFile(fullPath, content, 'utf8');
    res.json({message: 'File saved successfully', path: filePath});
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({error: 'Failed to save file'});
  }
});

app.delete('/api/files/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      await fs.rm(fullPath, {recursive: true, force: true});
      res.json({message: 'Folder deleted successfully', path: filePath});
    } else {
      await fs.unlink(fullPath);
      res.json({message: 'File deleted successfully', path: filePath});
    }
  } catch (error) {
    console.error('Error deleting file/folder:', error);
    res.status(500).json({error: 'Failed to delete file/folder'});
  }
});

app.delete('/api/folders/*', async (req, res) => {
  try {
    const folderPath = req.params[0];
    const fullPath = path.join(contentDir, folderPath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    await fs.rm(fullPath, {recursive: true, force: true});
    res.json({message: 'Folder deleted successfully', path: folderPath});
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({error: 'Failed to delete folder'});
  }
});

app.put('/api/rename/*', async (req, res) => {
  try {
    const oldPath = req.params[0];
    const {newName} = req.body;
    
    if (!newName) {
      return res.status(400).json({error: 'New name is required'});
    }

    const oldFullPath = path.join(contentDir, oldPath);
    if (!oldFullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    // Get the directory and create new path
    const parentDir = path.dirname(oldFullPath);
    const newFullPath = path.join(parentDir, newName);
    
    if (!newFullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    // Check if new path already exists
    try {
      await fs.access(newFullPath);
      return res.status(409).json({error: 'A file or folder with that name already exists'});
    } catch {
      // File doesn't exist, continue with rename
    }

    // Perform the rename
    await fs.rename(oldFullPath, newFullPath);
    
    const newPath = path.relative(contentDir, newFullPath);
    res.json({message: 'Item renamed successfully', oldPath, newPath});
  } catch (error) {
    console.error('Error renaming item:', error);
    res.status(500).json({error: 'Failed to rename item'});
  }
});

app.post('/api/commit', async (req, res) => {
  try {
    const {message} = req.body;
    if (!message) {
      return res.status(400).json({error: 'Commit message is required'});
    }

    await git.cwd(contentDir);
    await git.add('.');
    await git.commit(message);
    res.json({message: 'Changes committed successfully'});
  } catch (error) {
    console.error('Error committing changes:', error);
    res.status(500).json({error: 'Failed to commit changes'});
  }
});

app.post('/api/push', async (req, res) => {
  try {
    await git.cwd(contentDir);
    await git.push('origin', 'main');
    res.json({message: 'Changes pushed successfully'});
  } catch (error) {
    console.error('Error pushing changes:', error);
    res.status(500).json({error: 'Failed to push changes'});
  }
});

app.get('/api/status', async (req, res) => {
  try {
    await git.cwd(contentDir);
    const status = await git.status();
    res.json(status);
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({error: 'Failed to get git status'});
  }
});

app.post('/api/clone', async (req, res) => {
  try {
    const {repoUrl, branch = 'main'} = req.body;
    if (!repoUrl) {
      return res.status(400).json({error: 'Repository URL is required'});
    }

    await ensureContentDir();
    
    // Clear existing content directory
    const items = await fs.readdir(contentDir);
    for (const item of items) {
      await fs.rm(path.join(contentDir, item), {recursive: true, force: true});
    }

    // Clone repository into content directory
    await git.clone(repoUrl, contentDir, ['--branch', branch]);
    
    // Set working directory for future git operations
    await git.cwd(contentDir);
    
    res.json({message: 'Repository cloned successfully', branch});
  } catch (error) {
    console.error('Error cloning repository:', error);
    res.status(500).json({error: 'Failed to clone repository'});
  }
});

app.post('/api/pull', async (req, res) => {
  try {
    const {branch = 'main'} = req.body;
    
    // Set working directory first
    await git.cwd(contentDir);
    
    // Check if content directory is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return res.status(400).json({error: 'Content directory is not a git repository. Please clone a repository first.'});
    }

    // Pull latest changes
    await git.pull('origin', branch);
    
    res.json({message: 'Repository updated successfully', branch});
  } catch (error) {
    console.error('Error pulling repository:', error);
    res.status(500).json({error: 'Failed to pull repository'});
  }
});

/**
 * Search endpoints
 */

// Search files by name
app.get('/api/search/files', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.json([]);
    }

    const searchResults = [];
    
    // Recursive function to search through files
    const searchInDirectory = async (dirPath) => {
      try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);
          const relativePath = path.relative(contentDir, fullPath);
          
          if (item.isDirectory()) {
            await searchInDirectory(fullPath);
          } else if (item.isFile() && item.name.endsWith('.md')) {
            // Check if filename contains the search query (case insensitive)
            if (item.name.toLowerCase().includes(query.toLowerCase())) {
              searchResults.push({
                name: item.name,
                path: relativePath.replace(/\\/g, '/'),
                type: 'file'
              });
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.error('Error reading directory:', dirPath, error.message);
      }
    };

    await searchInDirectory(contentDir);
    
    res.json(searchResults.slice(0, 10)); // Limit results
  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({error: 'Failed to search files'});
  }
});

// Search content within files
app.get('/api/search/content', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.json([]);
    }

    const searchResults = [];
    const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    // Recursive function to search through file contents
    const searchInDirectory = async (dirPath) => {
      try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);
          const relativePath = path.relative(contentDir, fullPath);
          
          if (item.isDirectory()) {
            await searchInDirectory(fullPath);
          } else if (item.isFile() && item.name.endsWith('.md')) {
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              const matches = [];
              let match;
              
              // Find all matches in the content
              while ((match = searchRegex.exec(content)) !== null) {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(content.length, match.index + query.length + 50);
                const preview = content.substring(start, end);
                
                // Highlight the matched text
                const highlightedPreview = preview.replace(
                  searchRegex, 
                  `<mark>$&</mark>`
                );
                
                matches.push({
                  fileName: item.name,
                  filePath: relativePath.replace(/\\/g, '/'),
                  preview: (start > 0 ? '...' : '') + highlightedPreview + (end < content.length ? '...' : ''),
                  matchIndex: match.index
                });
                
                // Limit matches per file
                if (matches.length >= 3) break;
              }
              
              if (matches.length > 0) {
                searchResults.push(...matches);
              }
            } catch (error) {
              // Skip files that can't be read
              console.error('Error reading file:', fullPath, error.message);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.error('Error reading directory:', dirPath, error.message);
      }
    };

    await searchInDirectory(contentDir);
    
    // Sort by relevance (files with more matches first)
    searchResults.sort((a, b) => {
      const aCount = (a.preview.match(/<mark>/g) || []).length;
      const bCount = (b.preview.match(/<mark>/g) || []).length;
      return bCount - aCount;
    });
    
    res.json(searchResults.slice(0, 20)); // Limit results
  } catch (error) {
    console.error('Error searching content:', error);
    res.status(500).json({error: 'Failed to search content'});
  }
});

/**
 * Template management endpoints
 */

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const templatesDir = path.join(__dirname, 'templates');
    
    // Create templates directory if it doesn't exist
    try {
      await fs.access(templatesDir);
    } catch {
      await fs.mkdir(templatesDir, { recursive: true });
    }
    
    const files = await fs.readdir(templatesDir);
    const templates = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(templatesDir, file);
        const templateData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        templates.push(templateData);
      }
    }
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({error: 'Failed to fetch templates'});
  }
});

// Get specific template
app.get('/api/templates/:templateName', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const templatesDir = path.join(__dirname, 'templates');
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const filePath = path.join(templatesDir, templateFile);
    
    const templateData = JSON.parse(await fs.readFile(filePath, 'utf8'));
    res.json(templateData);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(404).json({error: 'Template not found'});
  }
});

// Create new template
app.post('/api/templates', async (req, res) => {
  try {
    const { name, content, description } = req.body;
    
    if (!name) {
      return res.status(400).json({error: 'Template name is required'});
    }
    
    const templatesDir = path.join(__dirname, 'templates');
    
    // Create templates directory if it doesn't exist
    try {
      await fs.access(templatesDir);
    } catch {
      await fs.mkdir(templatesDir, { recursive: true });
    }
    
    const templateFile = `${name.replace('.md', '')}.json`;
    const filePath = path.join(templatesDir, templateFile);
    
    // Check if template already exists
    try {
      await fs.access(filePath);
      return res.status(400).json({error: 'Template already exists'});
    } catch {
      // Template doesn't exist, continue
    }
    
    const templateData = {
      name,
      content: content || '',
      description: description || '',
      createdAt: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(templateData, null, 2));
    res.json({message: 'Template created successfully', template: templateData});
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({error: 'Failed to create template'});
  }
});

// Update template
app.put('/api/templates/:templateName', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const { name, content, description } = req.body;
    
    const templatesDir = path.join(__dirname, 'templates');
    const oldTemplateFile = `${templateName.replace('.md', '')}.json`;
    const oldFilePath = path.join(templatesDir, oldTemplateFile);
    
    // Read existing template
    const existingTemplate = JSON.parse(await fs.readFile(oldFilePath, 'utf8'));
    
    // Update template data
    const updatedTemplate = {
      ...existingTemplate,
      name: name || existingTemplate.name,
      content: content !== undefined ? content : existingTemplate.content,
      description: description !== undefined ? description : existingTemplate.description,
      updatedAt: new Date().toISOString()
    };
    
    // If name changed, create new file and delete old one
    if (name && name !== templateName) {
      const newTemplateFile = `${name.replace('.md', '')}.json`;
      const newFilePath = path.join(templatesDir, newTemplateFile);
      
      // Check if new name already exists
      try {
        await fs.access(newFilePath);
        return res.status(400).json({error: 'Template with new name already exists'});
      } catch {
        // New name doesn't exist, continue
      }
      
      await fs.writeFile(newFilePath, JSON.stringify(updatedTemplate, null, 2));
      await fs.unlink(oldFilePath);
    } else {
      await fs.writeFile(oldFilePath, JSON.stringify(updatedTemplate, null, 2));
    }
    
    res.json({message: 'Template updated successfully', template: updatedTemplate});
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({error: 'Failed to update template'});
  }
});

// Delete template
app.delete('/api/templates/:templateName', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const templatesDir = path.join(__dirname, 'templates');
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const filePath = path.join(templatesDir, templateFile);
    
    await fs.unlink(filePath);
    res.json({message: 'Template deleted successfully'});
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({error: 'Failed to delete template'});
  }
});

// Helper functions for server pages
function getSharedStyles() {
  return `
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css">
    <style>
    :root {
      --confluence-primary: #0052cc;
      --confluence-primary-hover: #0747a6;
      --confluence-secondary: #6b778c;
      --confluence-text: #172b4d;
      --confluence-text-subtle: #6b778c;
      --confluence-bg: #f7f8fa;
      --confluence-bg-card: #ffffff;
      --confluence-border: #e5e8ec;
      --confluence-border-subtle: #f4f5f7;
      --confluence-success: #36b37e;
      --confluence-danger: #de350b;
      --confluence-warning: #ffab00;
      --confluence-info: #0052cc;
    }

    /* Bootstrap overrides for Confluence theme */
    .btn-primary {
      --bs-btn-bg: var(--confluence-primary);
      --bs-btn-border-color: var(--confluence-primary);
      --bs-btn-hover-bg: var(--confluence-primary-hover);
      --bs-btn-hover-border-color: var(--confluence-primary-hover);
      --bs-btn-active-bg: var(--confluence-primary-hover);
      --bs-btn-active-border-color: var(--confluence-primary-hover);
      font-weight: 500;
      border-radius: 4px;
    }

    .btn-secondary {
      --bs-btn-bg: #f4f5f7;
      --bs-btn-border-color: #dfe1e6;
      --bs-btn-color: var(--confluence-text);
      --bs-btn-hover-bg: #e4e6ea;
      --bs-btn-hover-border-color: #c1c7d0;
      --bs-btn-hover-color: var(--confluence-text);
      --bs-btn-active-bg: #e4e6ea;
      --bs-btn-active-border-color: #c1c7d0;
      font-weight: 500;
      border-radius: 4px;
    }

    .form-control, .form-select {
      border: 2px solid var(--confluence-border);
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .form-control:focus, .form-select:focus {
      border-color: var(--confluence-primary);
      box-shadow: 0 0 0 0.2rem rgba(0, 82, 204, 0.25);
    }

    .card {
      border: 1px solid var(--confluence-border);
      border-radius: 4px;
      box-shadow: 0 1px 2px rgba(9, 30, 66, 0.08);
    }

    .card-header {
      background-color: var(--confluence-bg-card);
      border-bottom: 1px solid var(--confluence-border);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      background-color: var(--confluence-bg);
      color: var(--confluence-text);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .app {
      min-height: 100vh;
    }

    .sidebar {
      width: 240px;
      background: var(--confluence-bg-card);
      border-right: 2px solid var(--confluence-border);
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      box-shadow: 2px 0 8px rgba(0, 82, 204, 0.06);
    }

    .sidebar-header {
      padding: 1.5rem 1rem;
      border-bottom: 2px solid var(--confluence-border);
      background: var(--confluence-bg-card);
    }

    .sidebar-header h1 {
      color: var(--confluence-text);
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
    }

    .sidebar-nav {
      padding: 1rem 0;
    }

    .nav-section {
      margin-bottom: 1.5rem;
    }

    .nav-section-title {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--confluence-text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .nav-item {
      display: block;
      padding: 0.75rem 1rem;
      color: var(--confluence-text);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 400;
      transition: all 0.2s ease;
      border-left: 3px solid transparent;
    }

    .nav-item:hover {
      background: var(--confluence-border-subtle);
      color: var(--confluence-primary);
      text-decoration: none;
    }

    .nav-item.active {
      background: #e6f3ff;
      color: var(--confluence-primary);
      font-weight: 500;
      border-left-color: var(--confluence-primary);
    }

    .main-content {
      margin-left: 240px;
      flex: 1;
      padding: 2rem;
      background: var(--confluence-bg);
      min-height: 100vh;
    }

    .content-header {
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .content-header h1 {
      color: var(--confluence-text);
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .content-header p {
      color: var(--confluence-text-subtle);
      font-size: 0.875rem;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: 1px solid #dfe1e6;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      background: #ffffff;
      color: #172b4d;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      line-height: 1;
    }

    .btn-primary {
      background: #0052cc;
      color: white;
      border-color: #0052cc;
    }

    .btn-primary:hover {
      background: #0747a6;
      border-color: #0747a6;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .btn-secondary:hover {
      background: #f4f5f7;
      border-color: #c1c7d0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .settings-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .settings-card {
      padding: 2rem;
    }

    .settings-card h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .settings-description {
      color: #5e6c84;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }

    .settings-form {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e5e8ec;
    }

    .settings-form h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .settings-actions h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #172b4d;
      font-size: 0.875rem;
    }

    .form-group input {
      width: 100%;
      padding: 0.75rem;
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .form-group input:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
    }

    .form-group input::placeholder {
      color: #8993a4;
    }

    .dashboard-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .stat-card h3 {
      color: #0052cc;
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .stat-card p {
      color: #5e6c84;
      font-size: 0.875rem;
      font-weight: 400;
    }

    .api-calls-table {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      overflow-x: auto;
    }

    .api-calls-table h2 {
      color: #172b4d;
      margin-bottom: 1rem;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .controls {
      margin-bottom: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .controls label {
      color: #172b4d;
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .controls input, .controls select {
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid #dfe1e6;
      background: #ffffff;
      color: #172b4d;
      font-size: 0.875rem;
    }

    .table-container {
      overflow-x: auto;
      max-height: 60vh;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid #dfe1e6;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e8ec;
    }

    th {
      background: #f4f5f7;
      font-weight: 500;
      color: #172b4d;
      position: sticky;
      top: 0;
      font-size: 0.875rem;
    }

    tr:hover {
      background: #f4f5f7;
    }

    .method-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: white;
    }

    .method-get { background: #36b37e; }
    .method-post { background: #0052cc; }
    .method-put { background: #ff8b00; }
    .method-delete { background: #de350b; }
    .method-patch { background: #6554c0; }

    .status-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: white;
    }

    .status-2xx { background: #36b37e; }
    .status-3xx { background: #ff8b00; }
    .status-4xx { background: #ff991f; }
    .status-5xx { background: #de350b; }

    .duration {
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      font-size: 0.875rem;
    }

    .timestamp {
      font-size: 0.875rem;
      color: #5e6c84;
    }

    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }
      
      .main-content {
        margin-left: 0;
        padding: 1rem;
      }
      
      .dashboard-stats {
        grid-template-columns: 1fr;
      }
      
      table {
        font-size: 0.8rem;
      }
      
      th, td {
        padding: 0.5rem;
      }
    }
  </style>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>`;
}

function getNavigation(activeSection) {
  return `
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1><i class="bi bi-building me-2"></i>Architecture Artifacts</h1>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-title">Overview</div>
          <a href="/" class="nav-item ${activeSection === 'overview' ? 'active' : ''}">
            <i class="bi bi-speedometer2 me-2"></i>Dashboard
          </a>
        </div>
        
        <div class="nav-section">
          <div class="nav-section-title">Settings</div>
          <a href="/settings" class="nav-item ${activeSection === 'settings' ? 'active' : ''}">
            <i class="bi bi-git me-2"></i>Git Repository
          </a>
        </div>
        
        <div class="nav-section">
          <div class="nav-section-title">Monitoring</div>
          <a href="/monitoring/api" class="nav-item ${activeSection === 'monitoring' ? 'active' : ''}">
            <i class="bi bi-graph-up me-2"></i>API Monitor
          </a>
        </div>
      </nav>
    </aside>
  `;
}

function getMonitoringScript() {
  return `<script>
    let allCalls = [];
    let autoRefreshInterval;

    async function fetchApiCalls() {
      try {
        console.log('Fetching API calls...');
        const response = await fetch('/api-monitor-data');
        console.log('Response received:', response.status);
        const data = await response.json();
        console.log('Data received:', data.length, 'calls');
        allCalls = data;
        updateStats(data);
        filterCalls();
      } catch (error) {
        console.error('Failed to fetch API calls:', error);
        document.getElementById('stats').innerHTML = \`
          <div class="stat-card" style="background: rgba(231, 76, 60, 0.8);">
            <h3>Error</h3>
            <p>Failed to load API data</p>
          </div>
        \`;
      }
    }

    function updateStats(calls) {
      console.log('Updating stats with', calls.length, 'calls');
      const totalCalls = calls.length;
      const successCalls = calls.filter(c => c.statusCode >= 200 && c.statusCode < 300).length;
      const errorCalls = calls.filter(c => c.statusCode >= 400).length;
      const avgDuration = calls.length > 0 ? Math.round(calls.reduce((sum, c) => sum + c.duration, 0) / calls.length) : 0;

      const statsElement = document.getElementById('stats');
      if (!statsElement) {
        console.error('Stats element not found!');
        return;
      }
      
      statsElement.innerHTML = 
        '<div class="stat-card">' +
          '<h3>' + totalCalls + '</h3>' +
          '<p>Total API Calls</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<h3>' + successCalls + '</h3>' +
          '<p>Successful Calls</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<h3>' + errorCalls + '</h3>' +
          '<p>Error Calls</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<h3>' + avgDuration + 'ms</h3>' +
          '<p>Avg Duration</p>' +
        '</div>';
      
      console.log('Stats updated successfully');
    }

    function filterCalls() {
      const methodFilter = document.getElementById('methodFilter').value;
      const statusFilter = document.getElementById('statusFilter').value;

      let filteredCalls = allCalls;

      if (methodFilter) {
        filteredCalls = filteredCalls.filter(call => call.method === methodFilter);
      }

      if (statusFilter) {
        filteredCalls = filteredCalls.filter(call => {
          const statusClass = Math.floor(call.statusCode / 100);
          return statusClass.toString() === statusFilter;
        });
      }

      updateTable(filteredCalls);
    }

    function updateTable(calls) {
      console.log('Updating table with', calls.length, 'calls');
      const tbody = document.getElementById('tableBody');
      if (!tbody) {
        console.error('Table body element not found!');
        return;
      }
      
      if (calls.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #7f8c8d;">No API calls recorded yet. Make some API requests to see data here.</td></tr>';
        return;
      }
      
      const rows = calls.map(call => {
        return '<tr>' +
          '<td class="timestamp">' + formatTime(call.timestamp) + '</td>' +
          '<td><span class="method-badge method-' + call.method.toLowerCase() + '">' + call.method + '</span></td>' +
          '<td>' + call.url + '</td>' +
          '<td><span class="status-badge status-' + Math.floor(call.statusCode/100) + 'xx">' + call.statusCode + '</span></td>' +
          '<td class="duration">' + call.duration + 'ms</td>' +
          '<td>' + formatBytes(call.responseSize) + '</td>' +
          '<td>' + (call.ip || 'Unknown') + '</td>' +
        '</tr>';
      });
      
      tbody.innerHTML = rows.join('');
      console.log('Table updated successfully');
    }

    function formatTime(timestamp) {
      return new Date(timestamp).toLocaleString();
    }

    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function refreshData() {
      fetchApiCalls();
    }
    
    async function testApiCall() {
      console.log('Making test API call...');
      try {
        const response = await fetch('/api/files');
        console.log('Test API call completed:', response.status);
        setTimeout(() => fetchApiCalls(), 1000);
      } catch (error) {
        console.error('Test API call failed:', error);
      }
    }

    function toggleAutoRefresh() {
      const autoRefreshCheckbox = document.getElementById('autoRefresh');
      if (autoRefreshCheckbox.checked) {
        autoRefreshInterval = setInterval(fetchApiCalls, 5000);
      } else {
        clearInterval(autoRefreshInterval);
      }
    }

    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh();
    });
    
    if (document.readyState !== 'loading') {
      console.log('DOM already loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh();
    }
  </script>`;
}

// Settings page with Git integration
app.get('/settings', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings - Architecture Artifacts</title>
  ${getSharedStyles()}
</head>
<body>
  <div class="app">
    ${getNavigation('settings')}
    <main class="main-content">
      <div class="content-header">
        <h1>Settings</h1>
        <p>Configure your repository and system settings</p>
      </div>
      
      <div class="settings-section">
        <div class="settings-card">
          <h2>Git Repository</h2>
          <p class="settings-description">Manage your Git repository connection and operations</p>
          
          <form id="cloneForm" class="settings-form">
            <h3>Clone Repository</h3>
            <div class="form-group">
              <label for="repo-url">Repository URL:</label>
              <input
                id="repo-url"
                type="url"
                placeholder="https://github.com/username/repository.git"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="branch">Branch:</label>
              <input
                id="branch"
                type="text"
                value="main"
                placeholder="main"
              />
            </div>
            
            <button type="submit" class="btn btn-primary">
              Clone Repository
            </button>
          </form>

          <div class="settings-actions">
            <h3>Repository Actions</h3>
            <button id="pullBtn" class="btn btn-secondary">
              Pull Latest Changes
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    document.getElementById('cloneForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const repoUrl = document.getElementById('repo-url').value;
      const branch = document.getElementById('branch').value;
      
      try {
        const response = await fetch('/api/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl, branch })
        });
        
        if (response.ok) {
          alert('Repository cloned successfully');
          document.getElementById('repo-url').value = '';
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });

    document.getElementById('pullBtn').addEventListener('click', async () => {
      try {
        const response = await fetch('/api/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch: 'main' })
        });
        
        if (response.ok) {
          alert('Repository updated successfully');
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });
  </script>
</body>
</html>`;
  
  res.send(html);
});

// API monitoring page
app.get('/monitoring/api', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Monitor - Architecture Artifacts</title>
  ${getSharedStyles()}
</head>
<body>
  <div class="app">
    ${getNavigation('monitoring')}
    <main class="main-content">
      <div class="content-header">
        <h1>API Monitor</h1>
        <p>Monitor API calls and system performance</p>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="refreshData()">Refresh</button>
          <button class="btn btn-secondary" onclick="testApiCall()">Test API</button>
        </div>
      </div>

      <div class="dashboard-stats" id="stats">
        <!-- Stats will be populated by JavaScript -->
      </div>

      <div class="api-calls-table">
        <h2>Recent API Calls</h2>
        <div class="controls">
          <label>
            Auto-refresh:
            <input type="checkbox" id="autoRefresh" onchange="toggleAutoRefresh()" checked>
          </label>
          <label>
            Filter by method:
            <select id="methodFilter" onchange="filterCalls()">
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </label>
          <label>
            Filter by status:
            <select id="statusFilter" onchange="filterCalls()">
              <option value="">All Status</option>
              <option value="2">2xx Success</option>
              <option value="3">3xx Redirect</option>
              <option value="4">4xx Client Error</option>
              <option value="5">5xx Server Error</option>
            </select>
          </label>
        </div>
        <div class="table-container">
          <table id="apiCallsTable">
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>URL</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Size</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <!-- API calls will be populated by JavaScript -->
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  ${getMonitoringScript()}
</body>
</html>`;
  
  res.send(html);
});

// Backend index page with navigation overview
app.get('/', (req, res) => {
  // Check if this is for the backend (no client build available or not in production)
  const isBackendRequest = process.env.NODE_ENV !== 'production' || !req.get('accept')?.includes('text/html');
  
  if (isBackendRequest) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Architecture Artifacts</title>
  ${getSharedStyles()}
</head>
<body>
  <div class="app">
    ${getNavigation('overview')}
    <main class="main-content">
      <div class="content-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your Architecture Artifacts system</p>
        </div>
      </div>
      
      <div class="dashboard-overview">
        <div class="overview-section">
          <h2>Quick Actions</h2>
          <div class="action-grid">
            <a href="/settings" class="action-card">
              <div class="action-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Configure Git repository and system settings</p>
            </a>
            
            <a href="/monitoring/api" class="action-card">
              <div class="action-icon">📊</div>
              <h3>API Monitor</h3>
              <p>Monitor API calls and system performance</p>
            </a>
          </div>
        </div>
        
        <div class="overview-section">
          <h2>System Status</h2>
          <div class="status-grid">
            <div class="status-card">
              <div class="status-indicator green"></div>
              <div class="status-content">
                <h3>Server Status</h3>
                <p>Running normally</p>
              </div>
            </div>
            
            <div class="status-card">
              <div class="status-indicator blue"></div>
              <div class="status-content">
                <h3>API Endpoints</h3>
                <p>All endpoints operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <style>
    .dashboard-overview {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    
    .overview-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    
    .overview-section h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    
    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }
    
    .action-card {
      display: block;
      padding: 1.5rem;
      background: #f4f5f7;
      border: 1px solid #dfe1e6;
      border-radius: 6px;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
    }
    
    .action-card:hover {
      background: #e4edfc;
      border-color: #0052cc;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .action-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    
    .action-card h3 {
      color: #172b4d;
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .action-card p {
      color: #5e6c84;
      font-size: 0.875rem;
      margin: 0;
    }
    
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .status-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f4f5f7;
      border: 1px solid #dfe1e6;
      border-radius: 6px;
    }
    
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .status-indicator.green {
      background: #36b37e;
    }
    
    .status-indicator.blue {
      background: #0052cc;
    }
    
    .status-content h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .status-content p {
      color: #5e6c84;
      font-size: 0.875rem;
      margin: 0;
    }
  </style>
</body>
</html>`;
    
    res.send(html);
    return;
  }
  
  // If in production and client build exists, serve the React app
  // This will be handled by the static middleware below
});

// API endpoint to get monitoring data
app.get('/api-monitor-data', (req, res) => {
  res.json(apiCalls);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
