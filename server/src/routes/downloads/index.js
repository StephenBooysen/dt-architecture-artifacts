const express = require('express');
const path = require('path');
const EventEmitter = require('events');
const createFilingService = require('../../services/filing/index.js');

const router = express.Router();

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

/** @const {string} Path to the markdown files directory */
const contentDir = path.join(__dirname, '../../../../content', 'markdown');

// Download endpoint for files
router.get('/*', async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const fullPath = path.join(contentDir, filePath);
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    const fileName = path.basename(filePath);
    const markdownFilePath = `markdown/${filePath}`;
    const stats = await filing.stat(markdownFilePath);
    
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
    
    // Stream the file using relative path with markdown prefix
    const fileBuffer = await filing.read(markdownFilePath);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(404).json({error: 'File not found'});
  }
});

module.exports = router;