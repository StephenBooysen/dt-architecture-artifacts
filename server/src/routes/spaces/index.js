const express = require('express');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const createFilingService = require('../../services/filing/index.js');

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