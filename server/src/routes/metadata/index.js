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

// Import metadata utilities
const {
  extractMetadata,
  extractComments,
  getCleanMarkdownContent,
  injectMetadata,
  injectComments,
  toggleStarred,
  getRecentEditsWithinDays,
  hasRecentEdits,
  getMostRecentEdit
} = require('../../utils/metadataParser');

/**
 * Get recent files (edited in the last 7 days)
 * GET /api/metadata/recent
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
 * GET /api/metadata/starred
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
 * POST /api/metadata/starred/*
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
router.get('/*', async (req, res) => {
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

module.exports = router;