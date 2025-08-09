/**
 * @fileoverview Space/workspace management routes
 * 
 * Provides comprehensive workspace management functionality including:
 * - Space creation, configuration, and deletion
 * - User access control and permissions management
 * - Filing provider configuration per space
 * - Space-specific file and folder operations
 * - Provider caching and lifecycle management
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const multer = require('multer');
const createFilingService = require('../../services/filing/index.js');
const userStorage = require('../../auth/userStorage');
const {
  cacheFirstContent,
  cacheFirstTree,
  cacheFirstTemplates,
  invalidateCacheOnWrite
} = require('../../../middleware/personalSpaceCache');

const router = express.Router();

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
    const spacesPath = path.join(__dirname, '../../../../server-data/spaces.json');
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
        fetchInterval: parseInt(filingConfig['git-fetch-interval']) || 5000,
        isReadonly: spaceConfig.access === 'readonly'
      }, new EventEmitter());
    } else {
      throw new Error(`Unsupported filing provider type: ${filingConfig.type}`);
    }

    // Validate the provider before caching
    if (!provider || typeof provider.read !== 'function') {
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
    const spacesPath = path.join(__dirname, '../../../../server-data/spaces.json');
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

/**
 * Middleware to check space access permissions
 * Includes authentication checking for both session and token-based auth
 */
function checkSpaceAccess(operation = 'read') {
  return (req, res, next) => {
    console.log(`[Server] checkSpaceAccess called for operation: ${operation}`);
    console.log(`[Server] Request headers Authorization:`, req.headers.authorization ? 'present' : 'missing');
    
    // First, check authentication (similar to requireAuth middleware)
    let user = null;
    
    // Check session-based auth first
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log(`[Server] Session-based auth found`);
      user = req.user;
    } else {
      console.log(`[Server] No session auth, checking token auth`);
      // Check token-based auth
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log(`[Server] Validating session token`);
        user = userStorage.validateSessionToken(token);
        
        // If not a session token, try API key authentication
        if (!user) {
          console.log(`[Server] Session token validation failed, trying API key`);
          user = userStorage.authenticateByApiKey(token);
          if (user) {
            console.log(`[Server] API key auth successful for user: ${user.username}`);
          } else {
            console.log(`[Server] API key validation failed`);
          }
        } else {
          console.log(`[Server] Session token auth successful for user: ${user.username}`);
        }
        
        if (user) {
          // Set user on request object so other middleware can access it
          req.user = user;
        }
      } else {
        console.log(`[Server] No Authorization header found`);
      }
    }
    
    if (!user) {
      console.log(`[Server] Authentication failed, returning 401`);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { spaceConfig, spaceName, filing } = req;
    
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
    
    // Set user context for filing provider (for Personal space user isolation)
    if (filing && typeof filing.setUserContext === 'function') {
      filing.setUserContext(user, spaceName);
    }
    
    next();
  };
}

/**
 * Space-aware version of getDirectoryTree.
 * Recursively builds a directory tree structure for markdown files using a specific filing provider.
 * @param {Object} filing - The filing provider instance to use.
 * @param {string} relativePath - The relative path from the root to scan.
 * @param {boolean} isReadonly - Whether this is a readonly space (affects path structure).
 * @return {Promise<Array>} The directory tree structure.
 */
async function getDirectoryTreeForSpace(filing, relativePath = '', isReadonly = false) {
  // For readonly spaces, access files directly from repository root
  // For writable spaces, use the markdown subfolder structure
  const basePath = isReadonly 
    ? (relativePath || '') 
    : (relativePath ? `markdown/${relativePath}` : 'markdown');
  
  const items = await filing.listDetailed(basePath);
  const tree = [];

  for (const item of items) {
    // Skip hidden files and folders (starting with .)
    if (item.name.startsWith('.')) {
      continue;
    }

    const relPath = relativePath ? path.join(relativePath, item.name) : item.name;

    if (item.isDirectory) {
      const children = await getDirectoryTreeForSpace(filing, relPath, isReadonly);
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
 * Detects file type based on file extension.
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
 * Helper function to get file path based on space type (readonly vs writable)
 */
function getSpaceFilePath(relativePath, isReadonly) {
  return isReadonly ? relativePath : `markdown/${relativePath}`;
}

/**
 * Configure multer storage for space-aware file uploads.
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory temporarily
  limits: {
    fileSize: 105 * 1024 * 1024, // 105MB limit
    fieldSize: 105 * 1024 * 1024,
    parts: 50,
    fields: 50
  },
  fileFilter: (req, file, cb) => {
    cb(null, true); // Accept all file types
  }
});

// Get files tree for a specific space
router.get('/:space/files', loadFilingProvider, checkSpaceAccess('read'), cacheFirstTree(), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const isReadonly = spaceConfig.access === 'readonly';
    const tree = await getDirectoryTreeForSpace(filing, '', isReadonly);
    res.json(tree);
  } catch (error) {
    console.error('Error getting files for space:', error);
    res.status(500).json({ error: 'Failed to load files' });
  }
});

// Get templates for a space
router.get('/:space/templates', loadFilingProvider, checkSpaceAccess('read'), cacheFirstTemplates(), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const isReadonly = spaceConfig.access === 'readonly';
    
    // Readonly spaces don't have templates - return empty array
    if (isReadonly) {
      console.log(`Skipping templates for readonly space: ${req.params.space}`);
      return res.json([]);
    }
    
    // For writable spaces, create templates directory if it doesn't exist
    await filing.ensureDir('templates');
    
    const files = await filing.list('templates');
    const templates = [];
    
    // Ensure files is iterable
    if (!Array.isArray(files)) {
      console.warn('filing.list returned non-array for templates:', files);
      return res.json({ templates: [] });
    }
    
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
router.post('/:space/templates', loadFilingProvider, checkSpaceAccess('write'), invalidateCacheOnWrite(), async (req, res) => {
  try {
    const filing = req.filing;
    const { name, content } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    
    const templatePath = `templates/${name}.json`;
    await filing.create(templatePath, JSON.stringify(content, null, 2));
    res.json({ message: 'Template created successfully', name });
  } catch (error) {
    console.error('Error creating template for space:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// File upload endpoint for a specific space
router.post('/:space/upload', loadFilingProvider, checkSpaceAccess('write'), invalidateCacheOnWrite(), upload.single('file'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const isReadonly = spaceConfig.access === 'readonly';
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folderPath = req.body.folderPath || '';
    const fileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
    const finalFilePath = folderPath ? path.join(folderPath, fileName) : fileName;
    
    // Use space-aware file path
    const fullSpacePath = getSpaceFilePath(finalFilePath, isReadonly);
    
    console.log(`Upload to space ${req.params.space}:`, {
      folderPath,
      fileName,
      finalFilePath,
      fullSpacePath,
      isReadonly
    });
    
    // Create the target directory if it doesn't exist
    if (folderPath) {
      const dirPath = getSpaceFilePath(folderPath, isReadonly);
      await filing.ensureDir(dirPath);
    }
    
    // Write file using filing provider
    await filing.create(fullSpacePath, req.file.buffer);

    res.json({
      message: 'File uploaded successfully',
      filePath: finalFilePath,
      fileName: fileName,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading file to space:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get file content for a specific space
router.get('/:space/content/*', loadFilingProvider, checkSpaceAccess('read'), cacheFirstContent(), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const isReadonly = spaceConfig.access === 'readonly';
    const filePath = req.params[0] || '';
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Use space-aware file path
    const fullSpacePath = getSpaceFilePath(filePath, isReadonly);
    const fileName = path.basename(filePath);
    
    console.log(`Get content from space ${req.params.space}:`, {
      filePath,
      fullSpacePath,
      isReadonly
    });
    
    // Get file stats
    const stats = await filing.stat(fullSpacePath);
    
    // Determine file type and handle accordingly
    const fileType = detectFileType(fileName);
    
    if (fileType === 'markdown' || fileType === 'text') {
      // Read as text
      const content = await filing.read(fullSpacePath, 'utf8');
      
      // For markdown files, return both full content and clean content
      if (fileType === 'markdown') {
        // Note: You may want to integrate comment parsing here if available
        res.json({
          content,
          cleanContent: content, // Would need comment parser integration
          path: filePath,
          fileType,
          size: stats.size,
          mtime: stats.mtime,
          hasComments: false
        });
      } else {
        res.json({
          content,
          path: filePath,
          fileType,
          size: stats.size,
          mtime: stats.mtime
        });
      }
    } else if (fileType === 'image' || fileType === 'pdf') {
      // Read as binary and convert to base64
      const buffer = await filing.read(fullSpacePath);
      const base64Content = buffer.toString('base64');
      res.json({
        content: base64Content,
        path: filePath,
        fileType,
        encoding: 'base64',
        size: stats.size,
        mtime: stats.mtime
      });
    } else {
      // Unknown file type - return file info for download
      res.json({
        path: filePath,
        fileType,
        size: stats.size,
        mtime: stats.mtime,
        downloadable: true
      });
    }
  } catch (error) {
    console.error('Error getting file content from space:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// Download endpoint for files in a specific space
router.get('/:space/download/*', loadFilingProvider, checkSpaceAccess('read'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const isReadonly = spaceConfig.access === 'readonly';
    const filePath = req.params[0] || '';
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Use space-aware file path
    const fullSpacePath = getSpaceFilePath(filePath, isReadonly);
    const fileName = path.basename(filePath);
    
    console.log(`Download from space ${req.params.space}:`, {
      filePath,
      fullSpacePath,
      isReadonly
    });
    
    // Get file stats
    const stats = await filing.stat(fullSpacePath);
    
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
      '.markdown': 'text/markdown',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Stream the file
    const fileBuffer = await filing.read(fullSpacePath);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading file from space:', error);
    res.status(404).json({ error: 'File not found' });
  }
});


// Update file content in a space (alternative content API)
router.put('/:space/content/*', loadFilingProvider, checkSpaceAccess('write'), invalidateCacheOnWrite(), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const isReadonly = spaceConfig.access === 'readonly';
    const filePath = req.params[0] || '';
    const { content } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Use space-aware file path
    const fullSpacePath = getSpaceFilePath(filePath, isReadonly);
    
    // Ensure directory exists
    const dirPath = path.dirname(fullSpacePath);
    if (dirPath && dirPath !== '.' && dirPath !== '/') {
      await filing.mkdir(dirPath, { recursive: true });
    }
    
    // Handle both text content and base64 data URLs for binary files
    let fileContent = content;
    if (typeof content === 'string' && content.startsWith('data:')) {
      const base64Match = content.match(/^data:[^;]+;base64,(.+)$/);
      if (base64Match) {
        fileContent = Buffer.from(base64Match[1], 'base64');
      }
    }
    
    await filing.update(fullSpacePath, fileContent);
    res.json({ message: 'File updated successfully', path: filePath });
  } catch (error) {
    console.error('Error updating file in space:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Delete file in a space
router.delete('/:space/content/*', loadFilingProvider, checkSpaceAccess('write'), invalidateCacheOnWrite(), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const isReadonly = spaceConfig.access === 'readonly';
    const filePath = req.params[0] || '';
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Use space-aware file path
    const fullSpacePath = getSpaceFilePath(filePath, isReadonly);
    
    const stats = await filing.stat(fullSpacePath);
    if (stats.isDirectory) {
      await filing.delete(fullSpacePath);
      res.json({ message: 'Folder deleted successfully', path: filePath });
    } else {
      await filing.delete(fullSpacePath);
      res.json({ message: 'File deleted successfully', path: filePath });
    }
  } catch (error) {
    console.error('Error deleting file/folder in space:', error);
    res.status(500).json({ error: 'Failed to delete file/folder' });
  }
});

// Get Git status for all spaces
router.get('/spaces/git-status', async (req, res) => {
  try {
    const spaces = JSON.parse(await fs.promises.readFile(path.join(__dirname, '../../../../server-data/spaces.json'), 'utf8'));
    const spaceStatus = {};

    for (const space of spaces) {
      try {
        const filing = await getFilingProviderForSpace(space.space);
        if (filing && filing.git) {
          const gitStatus = await filing.git.status();
          spaceStatus[space.space] = {
            healthy: true,
            repo: space.filing?.git,
            branch: space.filing?.['git-branch'],
            localPath: space.filing?.localFolder,
            lastSync: filing.lastRemoteSync,
            gitStatus: {
              ahead: gitStatus.ahead,
              behind: gitStatus.behind,
              modified: gitStatus.modified,
              not_added: gitStatus.not_added,
              current: gitStatus.current
            }
          };
        } else {
          spaceStatus[space.space] = {
            healthy: false,
            repo: space.filing?.git,
            branch: space.filing?.['git-branch'],
            localPath: space.filing?.localFolder,
            error: 'Git provider not initialized'
          };
        }
      } catch (error) {
        spaceStatus[space.space] = {
          healthy: false,
          repo: space.filing?.git,
          branch: space.filing?.['git-branch'],
          localPath: space.filing?.localFolder,
          error: error.message
        };
      }
    }

    res.json(spaceStatus);
  } catch (error) {
    console.error('Error getting git status:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to get git status', details: error.message });
  }
});

// Resync a specific space (force pull)
router.post('/:space/resync', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceName = req.params.space;
    
    if (!filing || !filing.git) {
      return res.status(400).json({ error: 'Git provider not available for this space' });
    }

    // Force fetch and pull latest changes using the new divergent branch handler
    await filing.git.fetch();
    const status = await filing.git.status();
    
    if (status.behind > 0 || status.ahead > 0) {
      await filing._handleDivergentBranches('origin');
      filing.lastRemoteSync = new Date().toISOString();
    }

    res.json({ 
      message: `Space "${spaceName}" resynced successfully`,
      syncTime: filing.lastRemoteSync,
      status: await filing.git.status()
    });
  } catch (error) {
    console.error(`Error resyncing space ${req.params.space}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Commit changes in a specific space
router.post('/:space/commit', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceName = req.params.space;
    const { message } = req.body;
    
    if (!filing || !filing.git) {
      return res.status(400).json({ error: 'Git provider not available for this space' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Commit message is required' });
    }

    // Add all changes and commit
    await filing.git.add('.');
    const commit = await filing.git.commit(message);
    
    // Try to push to remote
    try {
      await filing.git.push('origin', filing.options.branch);
    } catch (pushError) {
      console.warn('Failed to push, but commit was successful:', pushError.message);
    }

    res.json({ 
      message: `Changes committed successfully in space "${spaceName}"`,
      commit: commit.commit,
      status: await filing.git.status()
    });
  } catch (error) {
    console.error(`Error committing changes in space ${req.params.space}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Force reset a specific space (discard all local changes)
router.post('/:space/force-reset', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceName = req.params.space;
    
    if (!filing || !filing.git) {
      return res.status(400).json({ error: 'Git provider not available for this space' });
    }

    // Reset to remote state
    await filing.git.fetch();
    await filing.git.reset(['--hard', `origin/${filing.options.branch}`]);
    filing.lastRemoteSync = new Date().toISOString();

    res.json({ 
      message: `Space "${spaceName}" force reset successfully`,
      syncTime: filing.lastRemoteSync,
      status: await filing.git.status()
    });
  } catch (error) {
    console.error(`Error force resetting space ${req.params.space}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get all available spaces (for settings page)
router.get('/spaces/all', (req, res) => {
  try {
    // Load spaces configuration
    const spacesPath = path.join(__dirname, '../../../../server-data/spaces.json');
    if (!fs.existsSync(spacesPath)) {
      return res.json([]);
    }
    
    const spacesData = fs.readFileSync(spacesPath, 'utf8');
    const allSpaces = JSON.parse(spacesData);
    
    // Return all spaces for settings page
    res.json(allSpaces);
  } catch (error) {
    console.error('Error loading all spaces:', error);
    res.status(500).json({ error: 'Failed to load spaces' });
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

module.exports = { router, loadFilingProvider, checkSpaceAccess, getFilingProviderForSpace, clearFilingProviderCache };