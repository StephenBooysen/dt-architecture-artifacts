const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const simpleGit = require('simple-git');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
 * Recursively builds a directory tree structure for markdown files.
 * @param {string} dirPath - The directory path to scan.
 * @param {string} relativePath - The relative path from the content root.
 * @return {Promise<Array>} The directory tree structure.
 */
async function getDirectoryTree(dirPath, relativePath = '') {
  const items = await fs.readdir(dirPath, {withFileTypes: true});
  const tree = [];

  for (const item of items) {
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
    } else if (item.name.endsWith('.md')) {
      tree.push({
        name: item.name,
        type: 'file',
        path: relPath,
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

    const content = await fs.readFile(fullPath, 'utf8');
    res.json({content, path: filePath});
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(404).json({error: 'File not found'});
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

app.post('/api/commit', async (req, res) => {
  try {
    const {message} = req.body;
    if (!message) {
      return res.status(400).json({error: 'Commit message is required'});
    }

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
    await git.push('origin', 'main');
    res.json({message: 'Changes pushed successfully'});
  } catch (error) {
    console.error('Error pushing changes:', error);
    res.status(500).json({error: 'Failed to push changes'});
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const status = await git.status();
    res.json(status);
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({error: 'Failed to get git status'});
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