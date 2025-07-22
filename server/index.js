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

// Backend index page with integrated API monitor
app.get('/', (req, res) => {
  // Check if this is for the backend (no client build available or not in production)
  const isBackendRequest = process.env.NODE_ENV !== 'production' || !req.get('accept')?.includes('text/html');
  
  if (isBackendRequest) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architecture Artifacts - Server Backend</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      background-attachment: fixed;
      min-height: 100vh;
      color: #2c3e50;
    }

    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-header {
      background: rgba(44, 62, 80, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .app-header h1 {
      color: white;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      background: rgba(52, 152, 219, 0.8);
      color: white;
    }

    .btn:hover {
      background: #2980b9;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .main-content {
      flex: 1;
      padding: 2rem;
    }

    .dashboard-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 16px;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .stat-card h3 {
      color: white;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .stat-card p {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .api-calls-table {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
    }

    .api-calls-table h2 {
      color: white;
      margin-bottom: 1rem;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .table-container {
      overflow-x: auto;
      max-height: 60vh;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.9);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
    }

    th {
      background: #ecf0f1;
      font-weight: 600;
      color: #2c3e50;
      position: sticky;
      top: 0;
    }

    tr:hover {
      background: rgba(52, 152, 219, 0.1);
    }

    .method-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: white;
    }

    .method-get { background: #27ae60; }
    .method-post { background: #3498db; }
    .method-put { background: #f39c12; }
    .method-delete { background: #e74c3c; }
    .method-patch { background: #9b59b6; }

    .status-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: white;
    }

    .status-2xx { background: #27ae60; }
    .status-3xx { background: #f39c12; }
    .status-4xx { background: #e67e22; }
    .status-5xx { background: #e74c3c; }

    .duration {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.85rem;
    }

    .timestamp {
      font-size: 0.8rem;
      color: #7f8c8d;
    }

    .controls {
      margin-bottom: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .controls label {
      color: white;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .controls input, .controls select {
      padding: 0.5rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.9);
      color: #2c3e50;
    }

    @media (max-width: 768px) {
      .dashboard-stats {
        grid-template-columns: 1fr;
      }
      
      .main-content {
        padding: 1rem;
      }
      
      table {
        font-size: 0.8rem;
      }
      
      th, td {
        padding: 0.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="app-header">
      <h1>🏗️ Server Backend - API Monitor</h1>
      <div class="header-actions">
        <a href="/api-monitor" class="btn">Full Dashboard</a>
        <button class="btn" onclick="refreshData()">Refresh</button>
        <button class="btn" onclick="testApiCall()">Test API</button>
      </div>
    </header>

    <main class="main-content">
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

  <script>
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
        // Show error in the stats area
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
        setTimeout(() => fetchApiCalls(), 1000); // Refresh after 1 second
      } catch (error) {
        console.error('Test API call failed:', error);
      }
    }

    function toggleAutoRefresh() {
      const autoRefreshCheckbox = document.getElementById('autoRefresh');
      if (autoRefreshCheckbox.checked) {
        autoRefreshInterval = setInterval(fetchApiCalls, 5000); // Refresh every 5 seconds
      } else {
        clearInterval(autoRefreshInterval);
      }
    }

    // Initial load - wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh(); // Start auto-refresh by default
    });
    
    // Also try immediate execution in case DOM is already loaded
    if (document.readyState === 'loading') {
      // DOM is still loading
    } else {
      // DOM is already loaded
      console.log('DOM already loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh();
    }
  </script>
</body>
</html>`;
    
    res.send(html);
    return;
  }
  
  // If in production and client build exists, serve the React app
  // This will be handled by the static middleware below
});

// API Monitoring Dashboard Routes
app.get('/api-monitor', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Monitor - Architecture Artifacts</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      background-attachment: fixed;
      min-height: 100vh;
      color: #2c3e50;
    }

    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-header {
      background: rgba(44, 62, 80, 0.8);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .app-header h1 {
      color: white;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      background: rgba(52, 152, 219, 0.8);
      color: white;
    }

    .btn:hover {
      background: #2980b9;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .main-content {
      flex: 1;
      padding: 2rem;
    }

    .dashboard-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 16px;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .stat-card h3 {
      color: white;
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .stat-card p {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .api-calls-table {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
    }

    .api-calls-table h2 {
      color: white;
      margin-bottom: 1rem;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .table-container {
      overflow-x: auto;
      max-height: 60vh;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.9);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
    }

    th {
      background: #ecf0f1;
      font-weight: 600;
      color: #2c3e50;
      position: sticky;
      top: 0;
    }

    tr:hover {
      background: rgba(52, 152, 219, 0.1);
    }

    .method-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: white;
    }

    .method-get { background: #27ae60; }
    .method-post { background: #3498db; }
    .method-put { background: #f39c12; }
    .method-delete { background: #e74c3c; }
    .method-patch { background: #9b59b6; }

    .status-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: white;
    }

    .status-2xx { background: #27ae60; }
    .status-3xx { background: #f39c12; }
    .status-4xx { background: #e67e22; }
    .status-5xx { background: #e74c3c; }

    .duration {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.85rem;
    }

    .timestamp {
      font-size: 0.8rem;
      color: #7f8c8d;
    }

    .controls {
      margin-bottom: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .controls label {
      color: white;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .controls input, .controls select {
      padding: 0.5rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.9);
      color: #2c3e50;
    }

    @media (max-width: 768px) {
      .dashboard-stats {
        grid-template-columns: 1fr;
      }
      
      .main-content {
        padding: 1rem;
      }
      
      table {
        font-size: 0.8rem;
      }
      
      th, td {
        padding: 0.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="app-header">
      <h1>API Monitor Dashboard</h1>
      <div class="header-actions">
        <a href="/" class="btn">Back to App</a>
        <button class="btn" onclick="refreshData()">Refresh</button>
      </div>
    </header>

    <main class="main-content">
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

  <script>
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
        // Show error in the stats area
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
        setTimeout(() => fetchApiCalls(), 1000); // Refresh after 1 second
      } catch (error) {
        console.error('Test API call failed:', error);
      }
    }

    function toggleAutoRefresh() {
      const autoRefreshCheckbox = document.getElementById('autoRefresh');
      if (autoRefreshCheckbox.checked) {
        autoRefreshInterval = setInterval(fetchApiCalls, 5000); // Refresh every 5 seconds
      } else {
        clearInterval(autoRefreshInterval);
      }
    }

    // Initial load - wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh(); // Start auto-refresh by default
    });
    
    // Also try immediate execution in case DOM is already loaded
    if (document.readyState === 'loading') {
      // DOM is still loading
    } else {
      // DOM is already loaded
      console.log('DOM already loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh();
    }
  </script>
</body>
</html>`;
  
  res.send(html);
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