/**
 * @fileoverview API Routes for Architecture Artifacts application.
 * 
 * This module contains all API endpoints for managing markdown files, folders, 
 * Git operations, authentication, templates, and search functionality.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const simpleGit = require('simple-git');
const multer = require('multer');
const userStorage = require('../auth/userStorage');
const passport = require('../auth/passport');

const router = express.Router();
const git = simpleGit();

/** @const {string} Path to the content directory where files are stored */
const contentDir = path.join(__dirname, '../../../content');

/**
 * Authentication middleware to protect routes
 */
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Optional authentication middleware (allows both authenticated and unauthenticated access)
 */
function optionalAuth(req, res, next) {
  next();
}

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
 * Replaces dynamic placeholders in template content with actual values.
 * 
 * This function processes template content and replaces special placeholder
 * indicators with real-time generated values like dates, user info, and file paths.
 * 
 * @param {string} content - The template content containing placeholders
 * @param {Object} context - Context information for placeholder replacement
 * @param {string} context.folder - Target folder path (empty string for root)
 * @param {string} context.filename - Target filename
 * @param {string} context.user - Current authenticated user
 * @return {string} Content with placeholders replaced
 */
function replacePlaceholders(content, context = {}) {
  if (!content) return content;
  
  const now = new Date();
  
  // Format date and time values
  const datetime = now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const date = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Prepare replacement values
  const replacements = {
    '{datetime}': datetime,
    '{date}': date,
    '{user}': context.user || 'Unknown User',
    '{dayofweek}': dayOfWeek,
    '{folder}': context.folder || '',
    '{filename}': context.filename || ''
  };
  
  // Replace all placeholders
  let processedContent = content;
  for (const [placeholder, value] of Object.entries(replacements)) {
    processedContent = processedContent.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  return processedContent;
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

// Authentication routes
router.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const user = await userStorage.createUser(username, password);
    res.json({ message: 'User created successfully', user });
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: 'User already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.post('/auth/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Login successful', user: req.user });
});

router.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logout successful' });
  });
});

router.get('/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Server status endpoint
router.get('/server/status', (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// OpenAPI specification endpoint
router.get('/spec/swagger.json', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const swaggerPath = path.join(__dirname, '../openapi/swagger.json');
  
  try {
    const swaggerSpec = fs.readFileSync(swaggerPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  } catch (error) {
    console.error('Error serving OpenAPI specification:', error);
    res.status(500).json({ error: 'Failed to load API specification' });
  }
});

router.get('/auth/users', requireAuth, (req, res) => {
  try {
    const users = userStorage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new folder - must come before wildcard routes
router.post('/folders', requireAuth, async (req, res) => {
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
router.post('/files', requireAuth, async (req, res) => {
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

router.get('/files', async (req, res) => {
  try {
    await ensureContentDir();
    const tree = await getDirectoryTree(contentDir);
    res.json(tree);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({error: 'Failed to get files'});
  }
});

router.get('/files/{*any}', async (req, res) => {
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
      
      // For markdown files, return both full content and clean content
      if (fileType === 'markdown') {
        const { getCleanMarkdownContent, extractComments } = require('../utils/commentParser');
        const cleanContent = getCleanMarkdownContent(content);
        const comments = extractComments(content);
        
        res.json({
          content, // Full content with comments for saving
          cleanContent, // Clean content for editing
          comments, // Extracted comments
          path: filePath, 
          fileType,
          hasComments: comments.length > 0
        });
      } else {
        res.json({content, path: filePath, fileType});
      }
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
router.get('/download/{*any}', async (req, res) => {
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
router.post('/upload', upload.single('file'), async (req, res) => {
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

router.post('/files/{*any}', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0];
    const {content} = req.body;
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    await fs.mkdir(path.dirname(fullPath), {recursive: true});
    
    // For markdown files, add metadata tracking
    let finalContent = content;
    if (filePath.endsWith('.md') && req.user && req.user.username) {
      try {
        // Extract existing metadata and comments
        const existingMetadata = extractMetadata(content);
        const existingComments = extractComments(content);
        const cleanContent = getCleanMarkdownContent(content);
        
        // Add recent edit entry
        const updatedMetadata = addRecentEdit(existingMetadata, req.user.username);
        
        // Combine content with comments and metadata
        finalContent = cleanContent;
        
        // Add comments if they exist
        if (existingComments.length > 0) {
          finalContent = injectComments(finalContent, existingComments);
        }
        
        // Add updated metadata
        finalContent = injectMetadata(finalContent, updatedMetadata);
        
      } catch (metadataError) {
        // If metadata processing fails, just use original content
        console.warn('Error processing metadata for file save:', metadataError);
        finalContent = content;
      }
    }
    
    await fs.writeFile(fullPath, finalContent, 'utf8');
    res.json({message: 'File saved successfully', path: filePath});
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({error: 'Failed to save file'});
  }
});

router.delete('/files/{*any}', requireAuth, async (req, res) => {
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

router.delete('/folders/{*any}', async (req, res) => {
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

router.put('/rename/{*any}', async (req, res) => {
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

// Git operations
router.post('/commit', requireAuth, async (req, res) => {
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

router.post('/push', async (req, res) => {
  try {
    await git.cwd(contentDir);
    await git.push('origin', 'main');
    res.json({message: 'Changes pushed successfully'});
  } catch (error) {
    console.error('Error pushing changes:', error);
    res.status(500).json({error: 'Failed to push changes'});
  }
});

router.get('/status', async (req, res) => {
  try {
    await git.cwd(contentDir);
    const status = await git.status();
    res.json(status);
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({error: 'Failed to get git status'});
  }
});

router.post('/clone', async (req, res) => {
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

router.post('/pull', async (req, res) => {
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

// Search endpoints

// Search files by name
router.get('/search/files', async (req, res) => {
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
router.get('/search/content', async (req, res) => {
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

// Template management endpoints

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const templatesDir = path.resolve('./content-templates');
    console.log(templatesDir);
    
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
router.get('/templates/:templateName', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const templatesDir = path.resolve('./content-templates');
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
router.post('/templates', async (req, res) => {
  try {
    const { name, content, description } = req.body;
    
    if (!name) {
      return res.status(400).json({error: 'Template name is required'});
    }
    
    const templatesDir = path.resolve('./content-templates');
    
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
router.put('/templates/:templateName', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const { name, content, description } = req.body;
    
    const templatesDir = path.resolve('./content-templates');
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
router.delete('/templates/:templateName', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const templatesDir = path.resolve('./content-templates');
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const filePath = path.join(templatesDir, templateFile);
    
    await fs.unlink(filePath);
    res.json({message: 'Template deleted successfully'});
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({error: 'Failed to delete template'});
  }
});

// Create file from template with placeholder replacement
router.post('/templates/:templateName/create-file', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const { filePath, customVariables = {} } = req.body;
    
    if (!filePath) {
      return res.status(400).json({error: 'File path is required'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Only markdown files (.md) are allowed'});
    }

    // Load the template
    const templatesDir = path.resolve('./content-templates');
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const templateFilePath = path.join(templatesDir, templateFile);
    
    let templateData;
    try {
      templateData = JSON.parse(await fs.readFile(templateFilePath, 'utf8'));
    } catch (error) {
      return res.status(404).json({error: 'Template not found'});
    }

    // Prepare context for placeholder replacement
    const fileName = path.basename(filePath, '.md');
    const folderPath = path.dirname(filePath);
    const folder = folderPath === '.' ? '' : folderPath;
    const user = req.user ? req.user.username : 'Test User';
    
    const context = {
      folder,
      filename: fileName,
      user
    };

    // Replace dynamic placeholders
    let processedContent = replacePlaceholders(templateData.content || '', context);

    // Replace custom template variables if they exist
    if (templateData.variables || Object.keys(customVariables).length > 0) {
      const allVariables = { ...templateData.variables, ...customVariables };
      
      for (const [key, value] of Object.entries(allVariables)) {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      }
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
    await fs.writeFile(fullPath, processedContent, 'utf8');
    
    res.json({
      message: 'File created from template successfully', 
      path: filePath,
      templateUsed: templateName,
      placeholdersReplaced: {
        datetime: true,
        date: true,
        user: true,
        dayofweek: true,
        folder: folder !== '',
        filename: true
      }
    });
  } catch (error) {
    console.error('Error creating file from template:', error);
    res.status(500).json({error: 'Failed to create file from template'});
  }
});

// Comment management endpoints

const {
  extractComments,
  getCleanMarkdownContent,
  injectComments,
  addComment,
  removeComment,
  updateComment,
  sortCommentsByNewest,
  isValidComment
} = require('../utils/commentParser');

const {
  extractMetadata,
  getCleanMarkdownContentWithoutMetadata,
  injectMetadata,
  createDefaultMetadata,
  addRecentEdit,
  toggleStarred,
  getRecentEditsWithinDays,
  hasRecentEdits,
  getMostRecentEdit,
  isValidMetadata,
  cleanupOldEdits
} = require('../utils/metadataParser');

// Get comments for a specific file
router.get('/comments/{*any}', async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    // Check if file exists and is a markdown file
    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    const content = await fs.readFile(fullPath, 'utf8');
    const comments = extractComments(content);
    const sortedComments = sortCommentsByNewest(comments);
    
    res.json({
      filePath,
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error getting comments:', error);
    res.status(500).json({error: 'Failed to get comments'});
  }
});

// Add a new comment to a file
router.post('/comments/{*any}', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0];
    const { content: commentContent } = req.body;
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    if (!commentContent || typeof commentContent !== 'string' || !commentContent.trim()) {
      return res.status(400).json({error: 'Comment content is required'});
    }

    // Read the current file content
    const markdownContent = await fs.readFile(fullPath, 'utf8');
    
    // Extract existing comments and clean content
    const existingComments = extractComments(markdownContent);
    const cleanContent = getCleanMarkdownContent(markdownContent);
    
    // Add the new comment
    const newComment = {
      author: req.user.username,
      content: commentContent.trim()
    };
    
    const updatedComments = addComment(existingComments, newComment);
    
    // Inject comments back into the content
    const updatedMarkdownContent = injectComments(cleanContent, updatedComments);
    
    // Save the updated content
    await fs.writeFile(fullPath, updatedMarkdownContent, 'utf8');
    
    // Return the new comment and updated list
    const sortedComments = sortCommentsByNewest(updatedComments);
    const newCommentData = sortedComments.find(c => c.author === req.user.username && c.content === commentContent.trim());
    
    res.json({
      message: 'Comment added successfully',
      comment: newCommentData,
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error adding comment:', error);
    res.status(500).json({error: 'Failed to add comment'});
  }
});

// Update an existing comment
router.put('/comments/:commentId/{*any}', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0];
    const commentId = req.params.commentId;
    const { content: commentContent } = req.body;
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    if (!commentContent || typeof commentContent !== 'string' || !commentContent.trim()) {
      return res.status(400).json({error: 'Comment content is required'});
    }

    // Read the current file content
    const markdownContent = await fs.readFile(fullPath, 'utf8');
    
    // Extract existing comments and clean content
    const existingComments = extractComments(markdownContent);
    const cleanContent = getCleanMarkdownContent(markdownContent);
    
    // Find the comment to update
    const commentToUpdate = existingComments.find(c => c.id === commentId);
    if (!commentToUpdate) {
      return res.status(404).json({error: 'Comment not found'});
    }

    // Check if user can update this comment (only author can update)
    if (commentToUpdate.author !== req.user.username) {
      return res.status(403).json({error: 'You can only update your own comments'});
    }
    
    // Update the comment
    const updatedComments = updateComment(existingComments, commentId, {
      content: commentContent.trim()
    });
    
    // Inject comments back into the content
    const updatedMarkdownContent = injectComments(cleanContent, updatedComments);
    
    // Save the updated content
    await fs.writeFile(fullPath, updatedMarkdownContent, 'utf8');
    
    // Return the updated comment and list
    const sortedComments = sortCommentsByNewest(updatedComments);
    const updatedComment = sortedComments.find(c => c.id === commentId);
    
    res.json({
      message: 'Comment updated successfully',
      comment: updatedComment,
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error updating comment:', error);
    res.status(500).json({error: 'Failed to update comment'});
  }
});

// Delete a comment
router.delete('/comments/:commentId/{*any}', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0];
    const commentId = req.params.commentId;
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    // Read the current file content
    const markdownContent = await fs.readFile(fullPath, 'utf8');
    
    // Extract existing comments and clean content
    const existingComments = extractComments(markdownContent);
    const cleanContent = getCleanMarkdownContent(markdownContent);
    
    // Find the comment to delete
    const commentToDelete = existingComments.find(c => c.id === commentId);
    if (!commentToDelete) {
      return res.status(404).json({error: 'Comment not found'});
    }

    // Check if user can delete this comment (only author can delete)
    if (commentToDelete.author !== req.user.username) {
      return res.status(403).json({error: 'You can only delete your own comments'});
    }
    
    // Remove the comment
    const updatedComments = removeComment(existingComments, commentId);
    
    // Inject comments back into the content (or just clean content if no comments left)
    const updatedMarkdownContent = updatedComments.length > 0 
      ? injectComments(cleanContent, updatedComments)
      : cleanContent;
    
    // Save the updated content
    await fs.writeFile(fullPath, updatedMarkdownContent, 'utf8');
    
    // Return the updated list
    const sortedComments = sortCommentsByNewest(updatedComments);
    
    res.json({
      message: 'Comment deleted successfully',
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error deleting comment:', error);
    res.status(500).json({error: 'Failed to delete comment'});
  }
});

// Recent files and starred files endpoints

/**
 * Get recent files (edited in the last 7 days)
 * GET /api/recent
 */
router.get('/recent', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const recentFiles = [];
    
    async function processDir(dirPath, relativePath = '') {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          await processDir(fullPath, entryRelativePath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const metadata = extractMetadata(content);
            
            if (hasRecentEdits(metadata, days)) {
              const mostRecentEdit = getMostRecentEdit(metadata);
              recentFiles.push({
                path: entryRelativePath,
                name: entry.name,
                lastEditBy: mostRecentEdit ? mostRecentEdit.username : 'Unknown',
                lastEditDate: mostRecentEdit ? mostRecentEdit.timestamp : null,
                recentEdits: getRecentEditsWithinDays(metadata, days)
              });
            }
          } catch (err) {
            console.warn(`Error processing file ${entryRelativePath}:`, err.message);
          }
        }
      }
    }
    
    await processDir(contentDir);
    
    // Sort by most recent edit first
    recentFiles.sort((a, b) => {
      const dateA = new Date(a.lastEditDate || 0);
      const dateB = new Date(b.lastEditDate || 0);
      return dateB - dateA;
    });
    
    res.json({
      files: recentFiles,
      days: days,
      count: recentFiles.length
    });
  } catch (error) {
    console.error('Error fetching recent files:', error);
    res.status(500).json({ error: 'Failed to fetch recent files' });
  }
});

/**
 * Get starred files
 * GET /api/starred
 */
router.get('/starred', async (req, res) => {
  try {
    const starredFiles = [];
    
    async function processDir(dirPath, relativePath = '') {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          await processDir(fullPath, entryRelativePath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const metadata = extractMetadata(content);
            
            if (metadata.starred) {
              starredFiles.push({
                path: entryRelativePath,
                name: entry.name,
                starredAt: metadata.starredAt || metadata.lastUpdated,
                lastEditBy: getMostRecentEdit(metadata)?.username || 'Unknown',
                lastEditDate: getMostRecentEdit(metadata)?.timestamp || null
              });
            }
          } catch (err) {
            console.warn(`Error processing file ${entryRelativePath}:`, err.message);
          }
        }
      }
    }
    
    await processDir(contentDir);
    
    // Sort by most recently starred first
    starredFiles.sort((a, b) => {
      const dateA = new Date(a.starredAt || 0);
      const dateB = new Date(b.starredAt || 0);
      return dateB - dateA;
    });
    
    res.json({
      files: starredFiles,
      count: starredFiles.length
    });
  } catch (error) {
    console.error('Error fetching starred files:', error);
    res.status(500).json({ error: 'Failed to fetch starred files' });
  }
});

/**
 * Toggle starred status for a file
 * POST /api/starred/*
 */
router.post('/starred/{*any}', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0];
    const { starred } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Validate and sanitize the file path
    if (filePath.includes('..') || filePath.includes('\\')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    const fullPath = path.join(contentDir, filePath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch (error) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Read current content
    const content = await fs.readFile(fullPath, 'utf8');
    const metadata = extractMetadata(content);
    const comments = extractComments(content);
    const cleanContent = getCleanMarkdownContent(content);
    
    // Toggle starred status
    const updatedMetadata = toggleStarred(metadata, starred);
    
    // Combine clean content with comments and metadata
    let updatedContent = cleanContent;
    
    // Add comments if they exist
    if (comments.length > 0) {
      updatedContent = injectComments(updatedContent, comments);
    }
    
    // Add metadata
    updatedContent = injectMetadata(updatedContent, updatedMetadata);
    
    // Write updated content
    await fs.writeFile(fullPath, updatedContent, 'utf8');
    
    res.json({
      message: `File ${updatedMetadata.starred ? 'starred' : 'unstarred'} successfully`,
      starred: updatedMetadata.starred,
      starredAt: updatedMetadata.starredAt
    });
  } catch (error) {
    console.error('Error toggling starred status:', error);
    res.status(500).json({ error: 'Failed to update starred status' });
  }
});

/**
 * Get metadata for a specific file
 * GET /api/metadata/*
 */
router.get('/metadata/{*any}', async (req, res) => {
  try {
    const filePath = req.params[0];
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Validate and sanitize the file path
    if (filePath.includes('..') || filePath.includes('\\')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    const fullPath = path.join(contentDir, filePath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch (error) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Read and extract metadata
    const content = await fs.readFile(fullPath, 'utf8');
    const metadata = extractMetadata(content);
    
    res.json({
      metadata: metadata,
      path: filePath
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

module.exports = router;