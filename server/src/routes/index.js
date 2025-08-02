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
const simpleGit = require('simple-git');
const multer = require('multer');
const userStorage = require('../auth/userStorage');
const passport = require('../auth/passport');
const EventEmitter = require('events');
const createFilingService = require('../services/filing/index.js');
const fs = require('fs');

// Cache for filing providers to avoid recreating them
const filingProviders = new Map();
// Track which providers are currently being created to prevent race conditions
const creatingProviders = new Set();

/**
 * Get the filing provider for a specific space
 * @param {string} spaceName - The name of the space
 * @returns {Object} The filing provider instance
 */
async function getFilingProviderForSpace(spaceName) {
  // Check if we already have a cached provider for this space
  if (filingProviders.has(spaceName)) {
    const cachedProvider = filingProviders.get(spaceName);
    // Validate the cached provider before returning it
    if (cachedProvider && typeof cachedProvider.readFile === 'function') {
      console.log(`Using cached filing provider for space: ${spaceName}, type: ${cachedProvider.type || 'local'}`);
      return cachedProvider;
    } else {
      // Remove invalid cached provider
      console.warn(`Removing invalid cached provider for space: ${spaceName}`);
      filingProviders.delete(spaceName);
    }
  }

  // Check if another request is already creating this provider
  if (creatingProviders.has(spaceName)) {
    // Wait for the other request to complete by polling
    console.log(`Waiting for filing provider creation for space: ${spaceName}`);
    let attempts = 0;
    while (creatingProviders.has(spaceName) && attempts < 50) { // Max 5 seconds wait
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Check if the provider was created by the other request
    if (filingProviders.has(spaceName)) {
      const cachedProvider = filingProviders.get(spaceName);
      console.log(`Using provider created by concurrent request for space: ${spaceName}`);
      return cachedProvider;
    }
  }

  // Mark that we're creating this provider
  creatingProviders.add(spaceName);
  
  try {
    // Load spaces configuration
    const spacesPath = path.join(__dirname, '../../../server-data/spaces.json');
    if (!fs.existsSync(spacesPath)) {
      throw new Error('Spaces configuration not found');
    }

    const spacesData = fs.readFileSync(spacesPath, 'utf8');
    const spaces = JSON.parse(spacesData);
    
    // Find the space configuration
    const spaceConfig = spaces.find(space => space.space === spaceName);
    if (!spaceConfig) {
      throw new Error(`Space '${spaceName}' not found in configuration`);
    }

    // Create filing provider based on space configuration
    const filingConfig = spaceConfig.filing;
    let provider;

    if (filingConfig.type === 'local') {
      provider = createFilingService('local', {
        localPath: filingConfig.localFolder
      }, new EventEmitter());
    } else if (filingConfig.type === 'git') {
      provider = createFilingService('git', {
        repo: filingConfig.git,
        localPath: filingConfig.localFolder,
        branch: filingConfig['git-branch'] || 'main',
        fetchInterval: parseInt(filingConfig['git-fetch-interval']) || 5000
      }, new EventEmitter());
    } else {
      throw new Error(`Unsupported filing provider type: ${filingConfig.type}`);
    }

    // Validate the provider before caching
    if (!provider || typeof provider.readFile !== 'function') {
      throw new Error(`Failed to create valid filing provider for space: ${spaceName}`);
    }

    // Add type information to the provider for debugging
    provider.type = filingConfig.type;
    provider.spaceName = spaceName;

    // Cache the provider
    console.log(`Created and cached filing provider for space: ${spaceName}, type: ${filingConfig.type}`);
    filingProviders.set(spaceName, provider);
    return provider;
  } catch (error) {
    console.error(`Error creating filing provider for space '${spaceName}':`, error);
    throw error;
  } finally {
    // Always remove from creating set when done
    creatingProviders.delete(spaceName);
  }
}

/**
 * Clear the filing provider cache for a specific space or all spaces
 * @param {string} [spaceName] - Optional space name to clear, if not provided clears all
 */
function clearFilingProviderCache(spaceName = null) {
  if (spaceName) {
    filingProviders.delete(spaceName);
    creatingProviders.delete(spaceName); // Also clean up creating set
    console.log(`Cleared filing provider cache for space: ${spaceName}`);
  } else {
    filingProviders.clear();
    creatingProviders.clear(); // Also clean up creating set
    console.log('Cleared all filing provider cache');
  }
}

/**
 * Middleware to load filing provider based on space parameter
 */
async function loadFilingProvider(req, res, next) {
  const spaceName = req.params.space;
  
  if (!spaceName) {
    return res.status(400).json({ error: 'Space parameter is required' });
  }

  try {
    // Get the filing provider (now async and race-condition safe)
    const filing = await getFilingProviderForSpace(spaceName);
    
    // The provider is already validated in getFilingProviderForSpace
    req.filing = filing;
    req.spaceName = spaceName;
    
    // Also get space configuration for access control
    const spacesPath = path.join(__dirname, '../../../server-data/spaces.json');
    const spacesData = fs.readFileSync(spacesPath, 'utf8');
    const spaces = JSON.parse(spacesData);
    const spaceConfig = spaces.find(space => space.space === spaceName);
    req.spaceConfig = spaceConfig;
    
    next();
  } catch (error) {
    console.error(`Error loading filing provider for space ${spaceName}:`, error);
    return res.status(404).json({ error: error.message });
  }
}

// Fallback filing provider (for backwards compatibility and non-space routes)
var filing = createFilingService('local', {
  localPath: path.join(__dirname, '../../../content')
}, new EventEmitter());

if (process.env.FILING_PROVIDER === 'git') {
  filing = createFilingService('git', {
    repo: 'https://github.com/StephenBooysen/dt-architecture-artifacts-testing.git',
    localPath: path.join(__dirname, '../../../temp-content'),
    branch: 'main',
    fetchInterval: 5000
  }, new EventEmitter());
  console.log('Using Git filing provider');
}

const router = express.Router();
const git = simpleGit();

/** @const {string} Path to the base content directory */
const baseContentDir = path.join(__dirname, '../../../content');

/** @const {string} Path to the markdown files directory */
const contentDir = path.join(baseContentDir, 'markdown');


/**
 * Middleware to check space access permissions
 */
function checkSpaceAccess(operation = 'read') {
  return (req, res, next) => {
    const { user, spaceConfig, spaceName } = req;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!spaceConfig) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    // Check if user has access to this space
    const userSpaces = user.spaces ? user.spaces.split(',').map(s => s.trim()) : [];
    if (!userSpaces.includes(spaceName)) {
      return res.status(403).json({ error: 'Access denied to this space' });
    }
    
    // Check if the operation is allowed for this space
    if (operation === 'write' && spaceConfig.access === 'readonly') {
      return res.status(403).json({ error: 'Write operations not allowed in this space' });
    }
    
    next();
  };
}

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
    fileSize: 105 * 1024 * 1024, // 105MB limit (to account for multipart overhead)
    fieldSize: 105 * 1024 * 1024, // 105MB field limit
    parts: 50, // Maximum number of parts
    fields: 50 // Maximum number of fields
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
 * Ensures the markdown directory exists, creating it if necessary.
 * 
 * This function checks if the markdown directory exists and creates it
 * recursively if it doesn't exist. It's used to ensure the storage
 * location is available before performing file operations.
 * 
 * @return {Promise<void>} Promise that resolves when directory exists
 * @throws {Error} If directory creation fails due to permissions or other issues
 */
async function ensureContentDir() {
  try {
    const exists = await filing.exists('markdown');
    if (!exists) {
      await filing.mkdir('markdown', {recursive: true});
    }
  } catch (error) {
    await filing.mkdir('markdown', {recursive: true});
  }
}

/**
 * Initializes the required directory structure for the application.
 * Creates markdown and templates directories and commits them if needed.
 * 
 * @return {Promise<void>} Promise that resolves when directories are set up
 */
async function initializeDirectoryStructure() {
  try {
    let needsCommit = false;
    
    // Ensure markdown directory exists
    const markdownExists = await filing.exists('markdown');
    if (!markdownExists) {
      await filing.mkdir('markdown', {recursive: true});
      needsCommit = true;
      console.log('📁 Created markdown directory');
    }
    
    // Ensure templates directory exists
    const templatesExists = await filing.exists('templates');
    if (!templatesExists) {
      await filing.mkdir('templates', {recursive: true});
      needsCommit = true;
      console.log('📁 Created templates directory');
    }
    
    // Create initial README if markdown directory is empty
    const contentFiles = await filing.list('markdown');
    const hasContent = contentFiles.some(file => file !== '.git');
    
    if (!hasContent) {
      const readmePath = 'markdown/README.md';
      const readmeExists = await filing.exists(readmePath);
      
      if (!readmeExists) {
        const welcomeContent = `# Architecture Artifacts

Welcome to your Architecture Artifacts workspace!

This repository contains your architectural documentation and templates.

## Structure

- \`markdown/\` - Your markdown documentation files
- \`templates/\` - Reusable document templates

## Getting Started

1. Create new documents using the web interface
2. Use templates to standardize your documentation
3. All changes are automatically version controlled with Git

Created automatically by the Architecture Artifacts system.
`;
        
        await filing.create(readmePath, welcomeContent);
        needsCommit = true;
        console.log('📄 Created initial README.md');
      }
    }
    
    // Commit initial structure if needed
    if (needsCommit) {
      const drafts = await filing.getDraftFiles();
      if (drafts.length > 0) {
        await filing.publish('Initialize directory structure\n\nCreated initial folders and README for Architecture Artifacts workspace.');
        console.log('✅ Committed initial directory structure to Git');
      }
    }
    
  } catch (error) {
    console.error('❌ Error initializing directory structure:', error);
    // Don't throw - let the application continue even if this fails
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
 * Recursively builds a directory tree structure for markdown files.
 * @param {string} relativePath - The relative path from the markdown root to scan.
 * @return {Promise<Array>} The directory tree structure.
 */
async function getDirectoryTree(relativePath = '') {
  const markdownBasePath = relativePath ? `markdown/${relativePath}` : 'markdown';
  const items = await filing.listDetailed(markdownBasePath);
  const tree = [];

  for (const item of items) {
    // Skip hidden files and folders (starting with .)
    if (item.name.startsWith('.')) {
      continue;
    }

    const relPath = relativePath ? path.join(relativePath, item.name) : item.name;

    if (item.isDirectory) {
      const children = await getDirectoryTree(relPath);
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

/**
 * Space-aware version of getDirectoryTree.
 * Recursively builds a directory tree structure for markdown files using a specific filing provider.
 * @param {Object} filing - The filing provider instance to use.
 * @param {string} relativePath - The relative path from the markdown root to scan.
 * @return {Promise<Array>} The directory tree structure.
 */
async function getDirectoryTreeForSpace(filing, relativePath = '') {
  const markdownBasePath = relativePath ? `markdown/${relativePath}` : 'markdown';
  const items = await filing.listDetailed(markdownBasePath);
  const tree = [];

  for (const item of items) {
    // Skip hidden files and folders (starting with .)
    if (item.name.startsWith('.')) {
      continue;
    }

    const relPath = relativePath ? path.join(relativePath, item.name) : item.name;

    if (item.isDirectory) {
      const children = await getDirectoryTreeForSpace(filing, relPath);
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
  // Check if user has write role for client access
  if (req.user && req.user.roles && req.user.roles.includes('write')) {
    res.json({ message: 'Login successful', user: req.user });
  } else {
    // Logout the user since they don't have proper permissions
    req.logout((err) => {
      if (err) {
        console.error('Error logging out user:', err);
      }
    });
    res.status(403).json({ error: 'Access denied: Write role required for client access' });
  }
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

// Initialize directory structure endpoint
router.post('/server/initialize', async (req, res) => {
  try {
    await initializeDirectoryStructure();
    res.json({
      message: 'Directory structure initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initializing directory structure:', error);
    res.status(500).json({error: 'Failed to initialize directory structure'});
  }
});

// OpenAPI specification endpoint
router.get('/spec/swagger.json', async (req, res) => {
  const path = require('path');
  const swaggerPath = path.join(__dirname, '../openapi/swagger.json');
  
  try {
    const swaggerSpec = await filing.read(swaggerPath, 'utf8');
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

// Debug endpoint to clear filing provider cache
router.post('/debug/clear-cache/:space?', (req, res) => {
  const spaceName = req.params.space;
  clearFilingProviderCache(spaceName);
  res.json({ 
    message: spaceName ? `Cleared cache for space: ${spaceName}` : 'Cleared all filing provider cache',
    remainingCacheKeys: Array.from(filingProviders.keys())
  });
});

// ========================================
// SPACE-AWARE ROUTES
// ========================================

// Get files tree for a specific space
router.get('/:space/files', loadFilingProvider, checkSpaceAccess('read'), async (req, res) => {
  try {
    const filing = req.filing;
    const tree = await getDirectoryTreeForSpace(filing);
    res.json(tree);
  } catch (error) {
    console.error('Error getting files for space:', error);
    res.status(500).json({ error: 'Failed to load files' });
  }
});

// Get specific file content for a space
router.get('/:space/files/*', loadFilingProvider, checkSpaceAccess('read'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceName = req.params.space;
    const filePath = req.params[0] || '';
    const markdownFilePath = `markdown/${filePath}`;
    
    console.log(`Reading file for space: ${spaceName}, filing type: ${filing.type || 'unknown'}, has readFile: ${typeof filing.readFile}`);
    console.log(`Available methods: ${Object.getOwnPropertyNames(filing).filter(prop => typeof filing[prop] === 'function')}`);
    
    const content = await filing.readFile(markdownFilePath);
    res.json({ content, path: filePath });
  } catch (error) {
    console.error('Error reading file for space:', error);
    if (error.message.includes('ENOENT') || error.message.includes('not found')) {
      res.status(404).json({ error: 'File not found' });
    } else {
      res.status(500).json({ error: 'Failed to read file' });
    }
  }
});

// Create file in a space
router.post('/:space/files/*', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const filePath = req.params[0] || '';
    const { content } = req.body;
    const markdownFilePath = `markdown/${filePath}`;
    
    await filing.writeFile(markdownFilePath, content || '');
    res.json({ message: 'File created successfully', path: filePath });
  } catch (error) {
    console.error('Error creating file for space:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// Update file in a space
router.put('/:space/files/*', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const filePath = req.params[0] || '';
    const { content } = req.body;
    const markdownFilePath = `markdown/${filePath}`;
    
    await filing.writeFile(markdownFilePath, content);
    res.json({ message: 'File updated successfully', path: filePath });
  } catch (error) {
    console.error('Error updating file for space:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Delete file in a space
router.delete('/:space/files/*', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const filePath = req.params[0] || '';
    const markdownFilePath = `markdown/${filePath}`;
    
    await filing.delete(markdownFilePath);
    res.json({ message: 'File deleted successfully', path: filePath });
  } catch (error) {
    console.error('Error deleting file for space:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Create folder in a space
router.post('/:space/folders', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const { folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }
    
    const markdownFolderPath = `markdown/${folderPath}`;
    await filing.createDirectory(markdownFolderPath);
    res.json({ message: 'Folder created successfully', path: folderPath });
  } catch (error) {
    console.error('Error creating folder for space:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Delete folder in a space
router.delete('/:space/folders/*', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const folderPath = req.params[0] || '';
    const markdownFolderPath = `markdown/${folderPath}`;
    
    await filing.delete(markdownFolderPath);
    res.json({ message: 'Folder deleted successfully', path: folderPath });
  } catch (error) {
    console.error('Error deleting folder for space:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Rename file/folder in a space
router.put('/:space/rename/*', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const oldPath = req.params[0] || '';
    const { newName } = req.body;
    
    if (!newName) {
      return res.status(400).json({ error: 'New name is required' });
    }
    
    const oldMarkdownPath = `markdown/${oldPath}`;
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newMarkdownPath = `markdown/${pathParts.join('/')}`;
    
    await filing.move(oldMarkdownPath, newMarkdownPath);
    res.json({ message: 'Item renamed successfully', oldPath, newPath: pathParts.join('/') });
  } catch (error) {
    console.error('Error renaming item for space:', error);
    res.status(500).json({ error: 'Failed to rename item' });
  }
});

// Get templates for a space
router.get('/:space/templates', loadFilingProvider, checkSpaceAccess('read'), async (req, res) => {
  try {
    const filing = req.filing;
    
    // Create templates directory if it doesn't exist
    await filing.ensureDir('templates');
    
    const files = await filing.list('templates');
    const templates = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = `templates/${file}`;
        try {
          const content = await filing.read(filePath, 'utf8');
          const template = JSON.parse(content);
          templates.push({
            name: file.replace('.json', ''),
            ...template
          });
        } catch (error) {
          console.error(`Error reading template ${file}:`, error);
        }
      }
    }
    
    res.json(templates);
  } catch (error) {
    console.error('Error getting templates for space:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

// Create template in a space
router.post('/:space/templates', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const { name, content } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    
    const templatePath = `templates/${name}.json`;
    await filing.writeFile(templatePath, JSON.stringify(content, null, 2));
    res.json({ message: 'Template created successfully', name });
  } catch (error) {
    console.error('Error creating template for space:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ========================================
// LEGACY ROUTES (for backwards compatibility)
// ========================================

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

    await filing.mkdir(folderPath, {recursive: true});
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

    // Check if file already exists (use relative path with markdown prefix)
    const markdownFilePath = `markdown/${filePath}`;
    const fileExists = await filing.exists(markdownFilePath);
    if (fileExists) {
      return res.status(409).json({error: 'File already exists'});
    }

    // Ensure directory exists (use relative path with markdown prefix)
    const dirPath = path.dirname(markdownFilePath);
    if (dirPath && dirPath !== '.' && dirPath !== '/') {
      await filing.mkdir(dirPath, {recursive: true});
    }
    await filing.create(markdownFilePath, content);
    
    res.json({message: 'File created successfully', path: filePath});
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({error: 'Failed to create file'});
  }
});

router.get('/files', async (req, res) => {
  try {
    await ensureContentDir();
    const tree = await getDirectoryTree();
    res.json(tree);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({error: 'Failed to get files'});
  }
});

router.get('/files/*', async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    const fileName = path.basename(filePath);
    const fileType = detectFileType(fileName);

    // Handle different file types
    if (fileType === 'markdown' || fileType === 'text') {
      // Read as text using relative path with markdown prefix
      const markdownFilePath = `markdown/${filePath}`;
      const content = await filing.read(markdownFilePath, 'utf8');
      
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
      // Read as binary and convert to base64 using relative path with markdown prefix
      const markdownFilePath = `markdown/${filePath}`;
      const buffer = await filing.read(markdownFilePath);
      const base64Content = buffer.toString('base64');
      res.json({content: base64Content, path: filePath, fileType, encoding: 'base64'});
    } else {
      // Unknown file type - return file info for download using relative path with markdown prefix
      const markdownFilePath = `markdown/${filePath}`;
      const stats = await filing.stat(markdownFilePath);
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
router.get('/download/*', async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    const fileName = path.basename(filePath);
    const markdownFilePath = `markdown/${filePath}`;
    const stats = await filing.stat(markdownFilePath);
    
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
    
    // Stream the file using relative path with markdown prefix
    const fileBuffer = await filing.read(markdownFilePath);
    res.send(fileBuffer);
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
    const tempFilePath = req.file.path; // Current location of uploaded file (absolute path)
    const finalFilePath = path.join(folderPath, req.file.filename);
    const finalFullPath = path.join(contentDir, finalFilePath);
    
    // Final path should include markdown prefix
    const finalMarkdownPath = `markdown/${finalFilePath}`;
    
    // Convert absolute temp file path to relative path for filing provider
    const tempFileRelativePath = path.relative(baseContentDir, tempFilePath);
    
    console.log('Folder path from request:', folderPath);
    console.log('Temp file path (absolute):', tempFilePath);
    console.log('Temp file path (relative):', tempFileRelativePath);
    console.log('Final file path:', finalFilePath);
    console.log('Final markdown path:', finalMarkdownPath);
    console.log('Final full path:', finalFullPath);
    
    // Validate that the final path is within the content directory
    if (!finalFullPath.startsWith(contentDir)) {
      // Clean up temp file
      await filing.delete(tempFileRelativePath);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create the target directory if it doesn't exist
    if (folderPath) {
      const markdownFolderPath = `markdown/${folderPath}`;
      await filing.mkdir(markdownFolderPath, { recursive: true });
    }
    
    // Move the file to the correct location using relative paths
    if (tempFileRelativePath !== finalMarkdownPath) {
      await filing.move(tempFileRelativePath, finalMarkdownPath);
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
        const tempFileRelativePath = path.relative(contentDir, req.file.path);
        await filing.delete(tempFileRelativePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.post('/files/*', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const {content} = req.body;
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }
    
    const markdownFilePath = `markdown/${filePath}`;
    await filing.mkdir(path.dirname(markdownFilePath), {recursive: true});
    
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
    
    await filing.update(markdownFilePath, finalContent); // Use relative path with markdown prefix
    res.json({message: 'File saved successfully', path: filePath});
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({error: 'Failed to save file'});
  }
});

router.delete('/files/*', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    const markdownFilePath = `markdown/${filePath}`;
    const stats = await filing.stat(markdownFilePath); // Use relative path with markdown prefix
    if (stats.isDirectory) {
      await filing.delete(markdownFilePath); // Use relative path with markdown prefix
      res.json({message: 'Folder deleted successfully', path: filePath});
    } else {
      await filing.delete(markdownFilePath); // Use relative path with markdown prefix
      res.json({message: 'File deleted successfully', path: filePath});
    }
  } catch (error) {
    console.error('Error deleting file/folder:', error);
    res.status(500).json({error: 'Failed to delete file/folder'});
  }
});

router.delete('/folders/*', async (req, res) => {
  try {
    const folderPath = req.params[0] || '';
    const fullPath = path.join(contentDir, folderPath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    const markdownFolderPath = `markdown/${folderPath}`;
    await filing.delete(markdownFolderPath); // Use relative path with markdown prefix
    res.json({message: 'Folder deleted successfully', path: folderPath});
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({error: 'Failed to delete folder'});
  }
});

router.put('/rename/*', async (req, res) => {
  try {
    const oldPath = req.params[0] || '';
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

    // Check if new path already exists (using markdown prefix)
    const oldMarkdownPath = `markdown/${oldPath}`;
    const newMarkdownPath = `markdown/${path.relative(contentDir, newFullPath)}`;
    const newPathExists = await filing.exists(newMarkdownPath);
    if (newPathExists) {
      return res.status(409).json({error: 'A file or folder with that name already exists'});
    }

    // Perform the rename
    await filing.move(oldMarkdownPath, newMarkdownPath);
    
    const newPath = path.relative(contentDir, newFullPath);
    res.json({message: 'Item renamed successfully', oldPath, newPath});
  } catch (error) {
    console.error('Error renaming item:', error);
    res.status(500).json({error: 'Failed to rename item'});
  }
});

// Git operations - Updated to use filing provider
router.post('/commit', requireAuth, async (req, res) => {
  try {
    const {message} = req.body;
    if (!message) {
      return res.status(400).json({error: 'Commit message is required'});
    }

    // Use the filing provider's publish method which handles drafts and requires a message
    const result = await filing.publish(message);
    
    res.json({
      message: 'Changes committed successfully',
      commit: result.commit,
      draftsCleared: true
    });
  } catch (error) {
    console.error('Error committing changes:', error);
    if (error.message.includes('A comment is required')) {
      res.status(400).json({error: 'Commit message is required'});
    } else {
      res.status(500).json({error: 'Failed to commit changes'});
    }
  }
});

router.post('/push', async (req, res) => {
  try {
    // Note: The Git filing provider's publish() method already pushes changes
    // This endpoint now provides information about push status
    res.json({
      message: 'Push operations are handled automatically by commit endpoint',
      note: 'Use /api/commit to commit and push changes simultaneously'
    });
  } catch (error) {
    console.error('Error with push operation:', error);
    res.status(500).json({error: 'Failed to handle push request'});
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
    const items = await filing.list(contentDir);
    for (const item of items) {
      await filing.delete(path.join(contentDir, item));
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

// Draft management endpoints for Git filing provider
router.get('/drafts', requireAuth, async (req, res) => {
  try {
    // Get list of draft files from the Git filing provider
    const draftFiles = await filing.getDraftFiles();
    
    res.json({
      drafts: draftFiles,
      count: draftFiles.length,
      message: draftFiles.length > 0 
        ? `You have ${draftFiles.length} draft file(s) ready to commit`
        : 'No draft files. All changes are committed.'
    });
  } catch (error) {
    console.error('Error getting draft files:', error);
    res.status(500).json({error: 'Failed to get draft files'});
  }
});

router.post('/discard-drafts', requireAuth, async (req, res) => {
  try {
    // Discard all draft changes and reset to remote state
    await filing.discardDrafts();
    
    res.json({
      message: 'All draft changes discarded successfully',
      note: 'Repository has been reset to match the remote state'
    });
  } catch (error) {
    console.error('Error discarding drafts:', error);
    res.status(500).json({error: 'Failed to discard draft changes'});
  }
});

// Enhanced status endpoint that includes draft information
router.get('/git-status', async (req, res) => {
  try {
    // Get draft files from filing provider
    const draftFiles = await filing.getDraftFiles();
    
    // Get traditional git status for additional info
    await git.cwd(contentDir);
    const gitStatus = await git.status();
    
    res.json({
      drafts: {
        files: draftFiles,
        count: draftFiles.length,
        hasDrafts: draftFiles.length > 0
      },
      git: gitStatus,
      repository: {
        url: filing.options.repo,
        branch: filing.options.branch,
        localPath: filing.options.localPath
      }
    });
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({error: 'Failed to get git status'});
  }
});

// Last sync info endpoint for efficient polling
router.get('/sync-status', async (req, res) => {
  try {
    // Get the last sync time from the Git provider if available
    let lastSync = null;
    let hasRemoteChanges = false;
    
    if (filing.lastRemoteSync) {
      lastSync = filing.lastRemoteSync;
    }
    
    res.json({
      lastSync,
      hasRemoteChanges,
      provider: filing.constructor.name.includes('Git') ? 'git' : 'local'
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({error: 'Failed to get sync status'});
  }
});

// Filing provider info endpoint
router.get('/provider-info', async (req, res) => {
  try {
    // Determine provider type based on filing service instance
    const providerType = filing.constructor.name.includes('Git') ? 'git' : 'local';
    
    res.json({
      provider: providerType,
      supportsDrafts: providerType === 'git',
      supportsCommits: providerType === 'git',
      info: {
        type: providerType,
        description: providerType === 'git' 
          ? 'Git-based filing with draft tracking and version control'
          : 'Local filesystem with immediate saves (no drafts)'
      }
    });
  } catch (error) {
    console.error('Error getting provider info:', error);
    res.status(500).json({error: 'Failed to get provider info'});
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
    
    // Recursive function to search through files in markdown directory
    const searchInDirectory = async (dirPath) => {
      try {
        const markdownDirPath = dirPath ? `markdown/${dirPath}` : 'markdown';
        const items = await filing.listDetailed(markdownDirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath || '', item.name);
          const relativePath = fullPath;
          
          if (item.isDirectory) {
            await searchInDirectory(fullPath);
          } else if (item.isFile && item.name.endsWith('.md')) {
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

    await searchInDirectory('');
    
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
    
    // Recursive function to search through file contents in markdown directory
    const searchInDirectory = async (dirPath) => {
      try {
        const markdownDirPath = dirPath ? `markdown/${dirPath}` : 'markdown';
        const items = await filing.listDetailed(markdownDirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath || '', item.name);
          const relativePath = fullPath;
          
          if (item.isDirectory) {
            await searchInDirectory(fullPath);
          } else if (item.isFile && item.name.endsWith('.md')) {
            try {
              const markdownFilePath = `markdown/${fullPath}`;
              const content = await filing.read(markdownFilePath, 'utf8');
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

    await searchInDirectory('');
    
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
    // Create templates directory if it doesn't exist
    await filing.ensureDir('templates');
    
    const files = await filing.list('templates');
    const templates = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = `templates/${file}`;
        const templateData = JSON.parse(await filing.read(filePath, 'utf8'));
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
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const filePath = `templates/${templateFile}`;
    
    const templateData = JSON.parse(await filing.read(filePath, 'utf8'));
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
    
    // Create templates directory if it doesn't exist
    await filing.ensureDir('templates');
    
    const templateFile = `${name.replace('.md', '')}.json`;
    const filePath = `templates/${templateFile}`;
    
    // Check if template already exists
    const templateExists = await filing.exists(filePath);
    if (templateExists) {
      return res.status(400).json({error: 'Template already exists'});
    }
    
    const templateData = {
      name,
      content: content || '',
      description: description || '',
      createdAt: new Date().toISOString()
    };
    
    await filing.create(filePath, JSON.stringify(templateData, null, 2));
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
    
    const oldTemplateFile = `${templateName.replace('.md', '')}.json`;
    const oldFilePath = `templates/${oldTemplateFile}`;
    
    // Read existing template
    const existingTemplate = JSON.parse(await filing.read(oldFilePath, 'utf8'));
    
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
      const newFilePath = `templates/${newTemplateFile}`;
      
      // Check if new name already exists
      const newNameExists = await filing.exists(newFilePath);
      if (newNameExists) {
        return res.status(400).json({error: 'Template with new name already exists'});
      }
      
      await filing.create(newFilePath, JSON.stringify(updatedTemplate, null, 2));
      await filing.delete(oldFilePath);
    } else {
      await filing.update(oldFilePath, JSON.stringify(updatedTemplate, null, 2));
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
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const filePath = `templates/${templateFile}`;
    
    await filing.delete(filePath);
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
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const templateFilePath = `templates/${templateFile}`;
    
    let templateData;
    try {
      templateData = JSON.parse(await filing.read(templateFilePath, 'utf8'));
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
    const markdownFilePath = `markdown/${filePath}`;
    const fileExists = await filing.exists(markdownFilePath); // Use relative path with markdown prefix
    if (fileExists) {
      return res.status(409).json({error: 'File already exists'});
    }

    // Ensure directory exists
    await filing.ensureDir(path.dirname(markdownFilePath)); // Use relative path with markdown prefix
    await filing.create(markdownFilePath, processedContent); // Use relative path with markdown prefix
    
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
router.get('/comments/*', async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    // Check if file exists and is a markdown file
    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    const markdownFilePath = `markdown/${filePath}`;
    const content = await filing.read(markdownFilePath, 'utf8');
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
router.post('/comments/*', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0] || '';
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
    const markdownFilePathForRead = `markdown/${filePath}`;
    const markdownContent = await filing.read(markdownFilePathForRead, 'utf8');
    
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
    const markdownFilePathForUpdate = `markdown/${filePath}`;
    await filing.update(markdownFilePathForUpdate, updatedMarkdownContent); // Use relative path with markdown prefix
    
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
router.put('/comments/:commentId/*', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0] || '';
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
    const markdownFilePathForRead = `markdown/${filePath}`;
    const markdownContent = await filing.read(markdownFilePathForRead, 'utf8');
    
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
    const markdownFilePathForUpdate = `markdown/${filePath}`;
    await filing.update(markdownFilePathForUpdate, updatedMarkdownContent); // Use relative path with markdown prefix
    
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
router.delete('/comments/:commentId/*', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const commentId = req.params.commentId;
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    // Read the current file content
    const markdownFilePathForRead = `markdown/${filePath}`;
    const markdownContent = await filing.read(markdownFilePathForRead, 'utf8');
    
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
    const markdownFilePathForUpdate = `markdown/${filePath}`;
    await filing.update(markdownFilePathForUpdate, updatedMarkdownContent); // Use relative path with markdown prefix
    
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
    
    async function processDir(relativePath = '') {
      const markdownDirPath = relativePath ? `markdown/${relativePath}` : 'markdown';
      const entries = await filing.listDetailed(markdownDirPath);
      
      for (const entry of entries) {
        const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory) {
          await processDir(entryRelativePath);
        } else if (entry.isFile && entry.name.endsWith('.md')) {
          try {
            const markdownFilePath = `markdown/${entryRelativePath}`;
            const content = await filing.read(markdownFilePath, 'utf8');
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
    
    await processDir();
    
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
    
    async function processDir(relativePath = '') {
      const markdownDirPath = relativePath ? `markdown/${relativePath}` : 'markdown';
      const entries = await filing.listDetailed(markdownDirPath);
      
      for (const entry of entries) {
        const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory) {
          await processDir(entryRelativePath);
        } else if (entry.isFile && entry.name.endsWith('.md')) {
          try {
            const markdownFilePath = `markdown/${entryRelativePath}`;
            const content = await filing.read(markdownFilePath, 'utf8');
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
    
    await processDir();
    
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
router.post('/starred/*', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const { starred } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Validate and sanitize the file path
    if (filePath.includes('..') || filePath.includes('\\')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    // Check if file exists
    const markdownFilePath = `markdown/${filePath}`;
    const fileExists = await filing.exists(markdownFilePath); // Use relative path with markdown prefix
    if (!fileExists) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Read current content
    const content = await filing.read(markdownFilePath, 'utf8');
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
    await filing.update(markdownFilePath, updatedContent); // Use relative path with markdown prefix
    
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
router.get('/metadata/*', async (req, res) => {
  try {
    const filePath = req.params[0] || '';

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Validate and sanitize the file path
    if (filePath.includes('..') || filePath.includes('\\')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    // Check if file exists
    const markdownFilePath = `markdown/${filePath}`;
    const fileExists = await filing.exists(markdownFilePath); // Use relative path with markdown prefix
    if (!fileExists) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Read and extract metadata
    const content = await filing.read(markdownFilePath, 'utf8');
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

/**
 * Get user's allowed spaces (alternative auth endpoint for extensions)
 */
router.get('/auth/user-spaces', requireAuth, (req, res) => {
  try {
    // Get current user from session
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Load spaces configuration
    const spacesFilePath = path.join(__dirname, '../../../server-data/spaces.json');
    if (!fs.existsSync(spacesFilePath)) {
      return res.json([]);
    }
    
    const spacesData = fs.readFileSync(spacesFilePath, 'utf8');
    const allSpaces = JSON.parse(spacesData);
    
    // Get user's allowed spaces from their profile
    const userSpaces = req.user.spaces ? req.user.spaces.split(',').map(s => s.trim()) : [];
    
    // Filter available spaces to only include those the user has access to
    const allowedSpaces = allSpaces.filter(space => userSpaces.includes(space.space));
    
    res.json(allowedSpaces);
  } catch (error) {
    console.error('Error loading user spaces:', error);
    res.status(500).json({ error: 'Failed to load user spaces' });
  }
});

/**
 * Get user's allowed spaces
 */
router.get('/user/spaces', requireAuth, (req, res) => {
  try {
    // Get current user from session
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Load spaces configuration
    const spacesFilePath = path.join(__dirname, '../../../server-data/spaces.json');
    if (!fs.existsSync(spacesFilePath)) {
      return res.json([]);
    }
    
    const spacesData = fs.readFileSync(spacesFilePath, 'utf8');
    const allSpaces = JSON.parse(spacesData);
    
    // Get user's allowed spaces from their profile
    const userSpaces = req.user.spaces ? req.user.spaces.split(',').map(s => s.trim()) : [];
    
    // Filter available spaces to only include those the user has access to
    const allowedSpaces = allSpaces.filter(space => userSpaces.includes(space.space));
    
    res.json(allowedSpaces);
  } catch (error) {
    console.error('Error loading user spaces:', error);
    res.status(500).json({ error: 'Failed to load user spaces' });
  }
});


module.exports = router;