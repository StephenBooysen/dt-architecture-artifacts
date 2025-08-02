const express = require('express');
const path = require('path');
const EventEmitter = require('events');
const createFilingService = require('../../services/filing/index.js');

const router = express.Router();

/**
 * Authentication middleware to protect routes
 */
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Fallback filing provider (for backwards compatibility and non-space routes)
var filing = createFilingService('local', {
  localPath: path.join(__dirname, '../../../../content')
}, new EventEmitter());

if (process.env.FILING_PROVIDER === 'git') {
  filing = createFilingService('git', {
    repo: 'https://github.com/StephenBooysen/dt-architecture-artifacts-testing.git',
    localPath: path.join(__dirname, '../../../../temp-content'),
    branch: 'main',
    fetchInterval: 5000
  }, new EventEmitter());
  console.log('Using Git filing provider');
}

/** @const {string} Path to the base content directory */
const baseContentDir = path.join(__dirname, '../../../../content');

/** @const {string} Path to the markdown files directory */
const contentDir = path.join(baseContentDir, 'markdown');

/**
 * Ensures the markdown directory exists, creating it if necessary.
 * @return {Promise<void>} Promise that resolves when directory exists
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

// Create new folder - must come before wildcard routes
router.post('/', requireAuth, async (req, res) => {
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

// Delete folder
router.delete('/*', async (req, res) => {
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

module.exports = router;