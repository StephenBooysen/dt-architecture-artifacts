const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const simpleGit = require('simple-git');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const git = simpleGit();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

const contentDir = path.join(__dirname, '../content');

// Configure multer for file uploads - store temporarily in root, then move to correct folder
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  }
});

/**
 * Ensures the content directory exists, creating it if necessary.
 * @return {Promise<void>}
 */
async function ensureContentDir() {
  try {
    await fs.access(contentDir);
  } catch {
    await fs.mkdir(contentDir, {recursive: true});
  }
}

/**
 * Detects file type based on extension
 * @param {string} fileName - The file name
 * @return {string} The file type
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

// Create new folder - must come before wildcard routes
app.post('/api/folders', async (req, res) => {
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
app.post('/api/files', async (req, res) => {
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

app.get('/api/files', async (req, res) => {
  try {
    await ensureContentDir();
    const tree = await getDirectoryTree(contentDir);
    res.json(tree);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({error: 'Failed to get files'});
  }
});

app.get('/api/files/*', async (req, res) => {
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
      res.json({content, path: filePath, fileType});
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
app.get('/api/download/*', async (req, res) => {
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
app.post('/api/upload', upload.single('file'), async (req, res) => {
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

app.post('/api/files/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const {content} = req.body;
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    await fs.mkdir(path.dirname(fullPath), {recursive: true});
    await fs.writeFile(fullPath, content, 'utf8');
    res.json({message: 'File saved successfully', path: filePath});
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({error: 'Failed to save file'});
  }
});

app.delete('/api/files/*', async (req, res) => {
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

app.delete('/api/folders/*', async (req, res) => {
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

app.put('/api/rename/*', async (req, res) => {
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

app.post('/api/commit', async (req, res) => {
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

app.post('/api/push', async (req, res) => {
  try {
    await git.cwd(contentDir);
    await git.push('origin', 'main');
    res.json({message: 'Changes pushed successfully'});
  } catch (error) {
    console.error('Error pushing changes:', error);
    res.status(500).json({error: 'Failed to push changes'});
  }
});

app.get('/api/status', async (req, res) => {
  try {
    await git.cwd(contentDir);
    const status = await git.status();
    res.json(status);
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({error: 'Failed to get git status'});
  }
});

app.post('/api/clone', async (req, res) => {
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

app.post('/api/pull', async (req, res) => {
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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});