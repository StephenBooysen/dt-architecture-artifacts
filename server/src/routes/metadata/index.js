/**
 * @fileoverview Metadata operations routes
 * 
 * Provides file metadata management functionality including:
 * - Metadata extraction and parsing from various file types
 * - Metadata storage and retrieval operations
 * - File property analysis and indexing
 * - Integration with filing service providers
 * - Support for custom metadata schemas
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
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

/**
 * Get space-aware filing provider for the current user
 */
async function getSpaceAwareFiling(req) {
  // Default to Personal space for metadata operations
  const spaceName = req.query.space || 'Personal';
  const user = req.user;
  
  if (!user) {
    throw new Error('User authentication required');
  }
  
  // Load spaces configuration to get the right provider
  const spacesPath = path.join(__dirname, '../../../../server-data/spaces.json');
  const spacesData = fs.readFileSync(spacesPath, 'utf8');
  const spaces = JSON.parse(spacesData);
  const spaceConfig = spaces.find(space => space.space === spaceName);
  
  if (!spaceConfig) {
    throw new Error(`Space '${spaceName}' not found`);
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
  
  // Set user context for Personal space isolation
  if (provider.setUserContext && typeof provider.setUserContext === 'function') {
    provider.setUserContext(user, spaceName);
  }
  
  return provider;
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
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const filing = await getSpaceAwareFiling(req);
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
router.get('/starred', requireAuth, async (req, res) => {
  try {
    const filing = await getSpaceAwareFiling(req);
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
    const filing = await getSpaceAwareFiling(req);
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
router.get('/*', requireAuth, async (req, res) => {
  try {
    const filing = await getSpaceAwareFiling(req);
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