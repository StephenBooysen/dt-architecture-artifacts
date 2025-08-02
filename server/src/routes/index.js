/**
 * @fileoverview Main API Routes for Architecture Artifacts application.
 * 
 * This module serves as the main router that delegates to specialized route modules.
 * All API endpoints are organized into logical groups for better maintainability.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

const express = require('express');
const path = require('path');
const simpleGit = require('simple-git');
const EventEmitter = require('events');
const createFilingService = require('../services/filing/index.js');

// Import specialized route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const { router: spacesRoutes, loadFilingProvider, checkSpaceAccess } = require('./spaces');
const folderRoutes = require('./folders');
const fileRoutes = require('./files');
const serverRoutes = require('./server');
const gitRoutes = require('./git');
const searchRoutes = require('./search');
const templateRoutes = require('./templates');
const commentRoutes = require('./comments');
const metadataRoutes = require('./metadata');
const downloadRoutes = require('./downloads');
const renameRoutes = require('./rename');

const router = express.Router();
const git = simpleGit();

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

/**
 * Authentication middleware to protect routes
 */
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// ========================================
// SPACE-AWARE ROUTES (New architecture)
// ========================================

// Get specific file content for a space
router.get('/:space/files/*', loadFilingProvider, checkSpaceAccess('read'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceName = req.params.space;
    const filePath = req.params[0] || '';
    const markdownFilePath = `markdown/${filePath}`;
    
    const fileName = path.basename(filePath);
    
    // Simple file type detection
    const detectFileType = (fileName) => {
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
    };
    
    const fileType = detectFileType(fileName);

    // Handle different file types
    if (fileType === 'markdown' || fileType === 'text') {
      // Read as text
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
      // Read as binary and convert to base64
      const buffer = await filing.read(markdownFilePath);
      const base64Content = buffer.toString('base64');
      res.json({content: base64Content, path: filePath, fileType, encoding: 'base64'});
    } else {
      // Unknown file type - return file info for download
      const stats = await filing.stat(markdownFilePath);
      res.json({
        path: filePath,
        fileType,
        downloadable: true,
        size: stats.size,
        lastModified: stats.mtime
      });
    }
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
    
    await filing.create(markdownFilePath, content || '');
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
    
    await filing.update(markdownFilePath, content);
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
    await filing.mkdir(markdownFolderPath, { recursive: true });
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

// ========================================
// ROUTE DELEGATION TO SPECIALIZED MODULES
// ========================================

// Authentication routes
router.use('/auth', authRoutes);

// User routes
router.use('/user', userRoutes);

// Server routes
router.use('/server', serverRoutes);

// Git version control routes
router.use('/git', gitRoutes);

// Search routes
router.use('/search', searchRoutes);

// Template routes
router.use('/templates', templateRoutes);

// Comment routes
router.use('/comments', commentRoutes);

// Metadata routes (recent/starred files)
router.use('/metadata', metadataRoutes);

// Download routes
router.use('/download', downloadRoutes);

// Rename routes
router.use('/rename', renameRoutes);

// File and folder routes (legacy support)
router.use('/files', fileRoutes);
router.use('/folders', folderRoutes);

// Space-aware routes (delegated to spaces module)
router.use('/', spacesRoutes);

// ========================================
// LEGACY ENDPOINTS (for backwards compatibility)
// ========================================

// Status endpoint (legacy)
router.get('/status', async (req, res) => {
  try {
    const contentDir = path.join(__dirname, '../../../content', 'markdown');
    await git.cwd(contentDir);
    const status = await git.status();
    res.json(status);
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({error: 'Failed to get git status'});
  }
});

// Commit endpoint (legacy)
router.post('/commit', requireAuth, async (req, res) => {
  try {
    const {message} = req.body;
    if (!message) {
      return res.status(400).json({error: 'Commit message is required'});
    }

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

// Push endpoint (legacy)
router.post('/push', async (req, res) => {
  try {
    res.json({
      message: 'Push operations are handled automatically by commit endpoint',
      note: 'Use /api/commit to commit and push changes simultaneously'
    });
  } catch (error) {
    console.error('Error with push operation:', error);
    res.status(500).json({error: 'Failed to handle push request'});
  }
});

// Draft management endpoints (legacy)
router.get('/drafts', requireAuth, async (req, res) => {
  try {
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

module.exports = router;