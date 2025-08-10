/**
 * @fileoverview Main API Routes for Architecture Artifacts application.
 * 
 * This module serves as the main router that delegates to specialized route modules.
 * All API endpoints are organized into logical groups for better maintainability.
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

const express = require('express');
const path = require('path');
const simpleGit = require('simple-git');
const EventEmitter = require('events');
const createFilingService = require('../services/filing/index.js');
const userStorage = require('../auth/userStorage');

// Import specialized route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const apiKeyRoutes = require('./api-keys');
const { router: spacesRoutes, loadFilingProvider, checkSpaceAccess } = require('./spaces');
const { invalidateCacheOnWrite } = require('../../middleware/personalSpaceCache');
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

/**
 * Helper function to get the correct file path based on space type
 * @param {string} filePath - The relative file path
 * @param {boolean} isReadonly - Whether this is a readonly space
 * @returns {string} The correct file path for the filing provider
 */
function getSpaceFilePath(filePath, isReadonly) {
  // For readonly spaces, use files directly from repository root
  // For writable spaces, use the markdown subfolder structure
  return isReadonly ? filePath : `markdown/${filePath}`;
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

/**
 * Authentication middleware to protect routes
 * Supports session-based (cookies), token-based (Authorization header), and API key authentication
 */
function requireAuth(req, res, next) {
  // First, check if user is authenticated via session (for web clients)
  if (req.isAuthenticated()) {
    return next();
  }
  
  // If not authenticated via session, check for Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Try session token first (for VS Code extension)
    let user = userStorage.validateSessionToken(token);
    
    // If not a session token, try API key authentication
    if (!user) {
      user = userStorage.authenticateByApiKey(token);
    }
    
    if (user) {
      // Set user on request object so other middleware can access it
      req.user = user;
      return next();
    }
  }
  
  res.status(401).json({ error: 'Authentication required' });
}

// ========================================
// SPACE-AWARE ROUTES (New architecture)
// ========================================

// Get specific file content for a space
router.get('/:space/files/*', loadFilingProvider, checkSpaceAccess('read'), async (req, res) => {
  try {
    console.log(`[Server] Space file request - Space: ${req.params.space}, File: ${req.params[0] || ''}`);
    console.log(`[Server] User authenticated:`, !!req.user);
    console.log(`[Server] User details:`, req.user ? { id: req.user.id, username: req.user.username } : 'none');
    console.log(`[Server] Request headers Authorization:`, req.headers.authorization ? 'present' : 'missing');
    
    const filing = req.filing;
    const spaceName = req.params.space;
    const spaceConfig = req.spaceConfig;
    const filePath = req.params[0] || '';
    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    
    console.log(`[Server] Space config:`, spaceConfig ? { space: spaceConfig.space, access: spaceConfig.access } : 'none');
    console.log(`[Server] Actual file path: ${actualFilePath}`);
    
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

    console.log(`[Server] File type detected: ${fileType}`);
    
    // Handle different file types
    if (fileType === 'markdown' || fileType === 'text') {
      console.log(`[Server] Reading text/markdown file: ${actualFilePath}`);
      // Read as text
      const content = await filing.read(actualFilePath, 'utf8');
      console.log(`[Server] File content length: ${content ? content.length : 'null/undefined'}`);
      
      // For markdown files, return both full content and clean content
      if (fileType === 'markdown') {
        console.log(`[Server] Processing markdown file`);
        const { getCleanMarkdownContent, extractComments } = require('../utils/commentParser');
        const cleanContent = getCleanMarkdownContent(content);
        const comments = extractComments(content);
        
        console.log(`[Server] Clean content length: ${cleanContent ? cleanContent.length : 'null/undefined'}`);
        console.log(`[Server] Comments found: ${comments.length}`);
        
        const response = {
          content, // Full content with comments for saving
          cleanContent, // Clean content for editing
          comments, // Extracted comments
          path: filePath, 
          fileType,
          hasComments: comments.length > 0
        };
        console.log(`[Server] Sending markdown response with keys:`, Object.keys(response));
        res.json(response);
      } else {
        console.log(`[Server] Sending text file response`);
        res.json({content, path: filePath, fileType});
      }
    } else if (fileType === 'image' || fileType === 'pdf') {
      // Read as binary and convert to base64
      const buffer = await filing.read(actualFilePath);
      const base64Content = buffer.toString('base64');
      res.json({content: base64Content, path: filePath, fileType, encoding: 'base64'});
    } else {
      // Unknown file type - return file info for download
      const stats = await filing.stat(actualFilePath);
      res.json({
        path: filePath,
        fileType,
        downloadable: true,
        size: stats.size,
        lastModified: stats.mtime
      });
    }
  } catch (error) {
    console.error(`[Server] Error reading file for space ${req.params.space}:`, error);
    console.error(`[Server] Error details:`, {
      message: error.message,
      stack: error.stack,
      filePath: req.params[0],
      actualFilePath: getSpaceFilePath(req.params[0] || '', req.spaceConfig?.access === 'readonly')
    });
    
    if (error.message.includes('ENOENT') || error.message.includes('not found')) {
      console.log(`[Server] Sending 404 - File not found`);
      res.status(404).json({ error: 'File not found' });
    } else {
      console.log(`[Server] Sending 500 - Failed to read file`);
      res.status(500).json({ error: 'Failed to read file' });
    }
  }
});

// Create file in a space (with filePath in body - for server-watcher)
router.post('/:space/files', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const { filePath, content } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    
    // Handle both text content and base64 data URLs for binary files
    let fileContent = content || '';
    if (typeof content === 'string' && content.startsWith('data:')) {
      // Extract base64 content from data URL
      const base64Match = content.match(/^data:[^;]+;base64,(.+)$/);
      if (base64Match) {
        fileContent = Buffer.from(base64Match[1], 'base64');
      }
    }
    
    // Ensure directory exists
    const dirPath = path.dirname(actualFilePath);
    if (dirPath && dirPath !== '.' && dirPath !== '/') {
      await filing.mkdir(dirPath, { recursive: true });
    }
    
    await filing.create(actualFilePath, fileContent);
    res.json({ message: 'File created successfully', path: filePath });
  } catch (error) {
    console.error('Error creating file for space:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// Create file in a space (with filePath in URL path)
router.post('/:space/files/*', loadFilingProvider, checkSpaceAccess('write'), invalidateCacheOnWrite(), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const filePath = req.params[0] || '';
    const { content } = req.body;
    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    
    // Ensure directory exists
    const dirPath = path.dirname(actualFilePath);
    if (dirPath && dirPath !== '.' && dirPath !== '/') {
      await filing.mkdir(dirPath, { recursive: true });
    }
    
    // Handle both text content and base64 data URLs for binary files
    let fileContent = content || '';
    if (typeof content === 'string' && content.startsWith('data:')) {
      const base64Match = content.match(/^data:[^;]+;base64,(.+)$/);
      if (base64Match) {
        fileContent = Buffer.from(base64Match[1], 'base64');
      }
    }
    
    await filing.create(actualFilePath, fileContent);
    res.json({ message: 'File created successfully', path: filePath });
  } catch (error) {
    console.error('Error creating file for space:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// Update file in a space (with filePath in body - for server-watcher)
router.put('/:space/files', loadFilingProvider, checkSpaceAccess('write'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const { filePath, content } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    
    // Handle both text content and base64 data URLs for binary files
    let fileContent = content || '';
    if (typeof content === 'string' && content.startsWith('data:')) {
      // Extract base64 content from data URL
      const base64Match = content.match(/^data:[^;]+;base64,(.+)$/);
      if (base64Match) {
        fileContent = Buffer.from(base64Match[1], 'base64');
      }
    }
    
    // Ensure directory exists
    const dirPath = path.dirname(actualFilePath);
    if (dirPath && dirPath !== '.' && dirPath !== '/') {
      await filing.mkdir(dirPath, { recursive: true });
    }
    
    await filing.update(actualFilePath, fileContent);
    res.json({ message: 'File updated successfully', path: filePath });
  } catch (error) {
    console.error('Error updating file for space:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Update file in a space (with filePath in URL path)
router.put('/:space/files/*', loadFilingProvider, checkSpaceAccess('write'), invalidateCacheOnWrite(), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const filePath = req.params[0] || '';
    const { content } = req.body;
    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    
    // Ensure directory exists
    const dirPath = path.dirname(actualFilePath);
    if (dirPath && dirPath !== '.' && dirPath !== '/') {
      await filing.mkdir(dirPath, { recursive: true });
    }
    
    // Handle both text content and base64 data URLs for binary files
    let fileContent = content || '';
    if (typeof content === 'string' && content.startsWith('data:')) {
      const base64Match = content.match(/^data:[^;]+;base64,(.+)$/);
      if (base64Match) {
        fileContent = Buffer.from(base64Match[1], 'base64');
      }
    }
    
    await filing.update(actualFilePath, fileContent);
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
    const spaceConfig = req.spaceConfig;
    const filePath = req.params[0] || '';
    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    
    await filing.delete(actualFilePath);
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
    const spaceConfig = req.spaceConfig;
    const { folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }
    
    const isReadonly = spaceConfig.access === 'readonly';
    const actualFolderPath = getSpaceFilePath(folderPath, isReadonly);
    await filing.mkdir(actualFolderPath, { recursive: true });
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
    const spaceConfig = req.spaceConfig;
    const folderPath = req.params[0] || '';
    const isReadonly = spaceConfig.access === 'readonly';
    const actualFolderPath = getSpaceFilePath(folderPath, isReadonly);
    
    await filing.delete(actualFolderPath);
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
    const spaceConfig = req.spaceConfig;
    const oldPath = req.params[0] || '';
    const { newName } = req.body;
    
    if (!newName) {
      return res.status(400).json({ error: 'New name is required' });
    }
    
    const isReadonly = spaceConfig.access === 'readonly';
    const oldActualPath = getSpaceFilePath(oldPath, isReadonly);
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');
    const newActualPath = getSpaceFilePath(newPath, isReadonly);
    
    await filing.move(oldActualPath, newActualPath);
    res.json({ message: 'Item renamed successfully', oldPath, newPath });
  } catch (error) {
    console.error('Error renaming item for space:', error);
    res.status(500).json({ error: 'Failed to rename item' });
  }
});

// ========================================
// SPACE-AWARE COMMENT ROUTES
// ========================================

// Get comments for a specific file in a space
router.get('/:space/comments/*', loadFilingProvider, checkSpaceAccess('read'), async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const filePath = req.params[0] || '';
    
    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    const content = await filing.read(actualFilePath, 'utf8');
    
    const { extractComments, sortCommentsByNewest } = require('../utils/commentParser');
    const comments = extractComments(content);
    const sortedComments = sortCommentsByNewest(comments);
    
    res.json({
      filePath,
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.message && error.message.includes('ENOENT')) {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error getting comments for space:', error);
    res.status(500).json({error: 'Failed to get comments'});
  }
});

// Add a new comment to a file in a space
router.post('/:space/comments/*', loadFilingProvider, checkSpaceAccess('write'), requireAuth, async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const filePath = req.params[0] || '';
    const { content: commentContent } = req.body;

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    if (!commentContent || typeof commentContent !== 'string' || !commentContent.trim()) {
      return res.status(400).json({error: 'Comment content is required'});
    }

    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    const markdownContent = await filing.read(actualFilePath, 'utf8');
    
    const { 
      extractComments, 
      getCleanMarkdownContent, 
      injectComments, 
      addComment, 
      sortCommentsByNewest 
    } = require('../utils/commentParser');
    
    const existingComments = extractComments(markdownContent);
    const cleanContent = getCleanMarkdownContent(markdownContent);
    
    const newComment = {
      author: req.user.username,
      content: commentContent.trim()
    };
    
    const updatedComments = addComment(existingComments, newComment);
    const updatedMarkdownContent = injectComments(cleanContent, updatedComments);
    
    await filing.update(actualFilePath, updatedMarkdownContent);
    
    const sortedComments = sortCommentsByNewest(updatedComments);
    const newCommentData = sortedComments.find(c => c.author === req.user.username && c.content === commentContent.trim());
    
    res.json({
      message: 'Comment added successfully',
      comment: newCommentData,
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.message && error.message.includes('ENOENT')) {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error adding comment for space:', error);
    res.status(500).json({error: 'Failed to add comment'});
  }
});

// Update an existing comment in a space
router.put('/:space/comments/:commentId/*', loadFilingProvider, checkSpaceAccess('write'), requireAuth, async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const filePath = req.params[0] || '';
    const commentId = req.params.commentId;
    const { content: commentContent } = req.body;

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    if (!commentContent || typeof commentContent !== 'string' || !commentContent.trim()) {
      return res.status(400).json({error: 'Comment content is required'});
    }

    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    const markdownContent = await filing.read(actualFilePath, 'utf8');
    
    const { 
      extractComments, 
      getCleanMarkdownContent, 
      injectComments, 
      updateComment, 
      sortCommentsByNewest 
    } = require('../utils/commentParser');
    
    const existingComments = extractComments(markdownContent);
    const cleanContent = getCleanMarkdownContent(markdownContent);
    
    const commentToUpdate = existingComments.find(c => c.id === commentId);
    if (!commentToUpdate) {
      return res.status(404).json({error: 'Comment not found'});
    }

    if (commentToUpdate.author !== req.user.username) {
      return res.status(403).json({error: 'You can only update your own comments'});
    }
    
    const updatedComments = updateComment(existingComments, commentId, {
      content: commentContent.trim()
    });
    
    const updatedMarkdownContent = injectComments(cleanContent, updatedComments);
    await filing.update(actualFilePath, updatedMarkdownContent);
    
    const sortedComments = sortCommentsByNewest(updatedComments);
    const updatedComment = sortedComments.find(c => c.id === commentId);
    
    res.json({
      message: 'Comment updated successfully',
      comment: updatedComment,
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.message && error.message.includes('ENOENT')) {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error updating comment for space:', error);
    res.status(500).json({error: 'Failed to update comment'});
  }
});

// Delete a comment in a space
router.delete('/:space/comments/:commentId/*', loadFilingProvider, checkSpaceAccess('write'), requireAuth, async (req, res) => {
  try {
    const filing = req.filing;
    const spaceConfig = req.spaceConfig;
    const filePath = req.params[0] || '';
    const commentId = req.params.commentId;

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    const isReadonly = spaceConfig.access === 'readonly';
    const actualFilePath = getSpaceFilePath(filePath, isReadonly);
    const markdownContent = await filing.read(actualFilePath, 'utf8');
    
    const { 
      extractComments, 
      getCleanMarkdownContent, 
      injectComments, 
      removeComment, 
      sortCommentsByNewest 
    } = require('../utils/commentParser');
    
    const existingComments = extractComments(markdownContent);
    const cleanContent = getCleanMarkdownContent(markdownContent);
    
    const commentToDelete = existingComments.find(c => c.id === commentId);
    if (!commentToDelete) {
      return res.status(404).json({error: 'Comment not found'});
    }

    if (commentToDelete.author !== req.user.username) {
      return res.status(403).json({error: 'You can only delete your own comments'});
    }
    
    const updatedComments = removeComment(existingComments, commentId);
    
    const updatedMarkdownContent = updatedComments.length > 0 
      ? injectComments(cleanContent, updatedComments)
      : cleanContent;
    
    await filing.update(actualFilePath, updatedMarkdownContent);
    
    const sortedComments = sortCommentsByNewest(updatedComments);
    
    res.json({
      message: 'Comment deleted successfully',
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.message && error.message.includes('ENOENT')) {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error deleting comment for space:', error);
    res.status(500).json({error: 'Failed to delete comment'});
  }
});

// ========================================
// ROUTE DELEGATION TO SPECIALIZED MODULES
// ========================================

// Authentication routes
router.use('/auth', authRoutes);

// User routes
router.use('/user', userRoutes);

// API Key routes  
router.use('/api-keys', apiKeyRoutes);

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