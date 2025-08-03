const express = require('express');
const path = require('path');
const multer = require('multer');
const EventEmitter = require('events');
const createFilingService = require('../../services/filing/index.js');
const userStorage = require('../../auth/userStorage');

const router = express.Router();

/**
 * Authentication middleware to protect routes
 * Supports both session-based (cookies) and token-based (Authorization header) authentication
 */
function requireAuth(req, res, next) {
  // First, check if user is authenticated via session (for web clients)
  if (req.isAuthenticated()) {
    return next();
  }
  
  // If not authenticated via session, check for Authorization header (for VS Code extension)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = userStorage.validateSessionToken(token);
    
    if (user) {
      // Set user on request object so other middleware can access it
      req.user = user;
      return next();
    }
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
 * Configure multer storage for file uploads.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store temporarily in the content directory
    cb(null, contentDir);
  },
  filename: (req, file, cb) => {
    // Use original filename, but sanitize it
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, sanitizedName);
  }
});

/**
 * Multer instance configured for file uploads.
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 105 * 1024 * 1024, // 105MB limit (to account for multipart overhead)
    fieldSize: 105 * 1024 * 1024, // 105MB field limit
    parts: 50, // Maximum number of parts
    fields: 50 // Maximum number of fields
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  }
});

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

// Create new file - must come before wildcard routes
router.post('/', requireAuth, async (req, res) => {
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

// Get files tree
router.get('/', async (req, res) => {
  try {
    await ensureContentDir();
    const tree = await getDirectoryTree();
    res.json(tree);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({error: 'Failed to get files'});
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

// Get specific file content
router.get('/*', async (req, res) => {
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
        const { getCleanMarkdownContent, extractComments } = require('../../utils/commentParser');
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

// Update file content
router.post('/*', requireAuth, async (req, res) => {
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
        const { extractMetadata, extractComments, getCleanMarkdownContent, addRecentEdit, injectComments, injectMetadata } = require('../../utils/metadataParser');
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

// Delete file
router.delete('/*', requireAuth, async (req, res) => {
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

module.exports = router;