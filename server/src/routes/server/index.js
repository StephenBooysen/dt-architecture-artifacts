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

/**
 * Initializes the required directory structure for the application.
 * Creates markdown and templates directories and commits them if needed.
 * @return {Promise<void>} Promise that resolves when directories are set up
 */
async function initializeDirectoryStructure() {
  try {
    let needsCommit = false;
    
    // Ensure markdown directory exists
    const markdownExists = await filing.exists('markdown');
    if (!markdownExists) {
      await filing.mkdir('markdown', {recursive: true});
      needsCommit = true;
      console.log('📁 Created markdown directory');
    }
    
    // Ensure templates directory exists
    const templatesExists = await filing.exists('templates');
    if (!templatesExists) {
      await filing.mkdir('templates', {recursive: true});
      needsCommit = true;
      console.log('📁 Created templates directory');
    }
    
    // Create initial README if markdown directory is empty
    const contentFiles = await filing.list('markdown');
    const hasContent = contentFiles.some(file => file !== '.git');
    
    if (!hasContent) {
      const readmePath = 'markdown/README.md';
      const readmeExists = await filing.exists(readmePath);
      
      if (!readmeExists) {
        const welcomeContent = `# Architecture Artifacts

Welcome to your Architecture Artifacts workspace!

This repository contains your architectural documentation and templates.

## Structure

- \`markdown/\` - Your markdown documentation files
- \`templates/\` - Reusable document templates

## Getting Started

1. Create new documents using the web interface
2. Use templates to standardize your documentation
3. All changes are automatically version controlled with Git

Created automatically by the Architecture Artifacts system.
`;
        
        await filing.create(readmePath, welcomeContent);
        needsCommit = true;
        console.log('📄 Created initial README.md');
      }
    }
    
    // Commit initial structure if needed
    if (needsCommit) {
      const drafts = await filing.getDraftFiles();
      if (drafts.length > 0) {
        await filing.publish('Initialize directory structure\n\nCreated initial folders and README for Architecture Artifacts workspace.');
        console.log('✅ Committed initial directory structure to Git');
      }
    }
    
  } catch (error) {
    console.error('❌ Error initializing directory structure:', error);
    // Don't throw - let the application continue even if this fails
  }
}

// Server status endpoint
router.get('/status', (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Initialize directory structure endpoint
router.post('/initialize', async (req, res) => {
  try {
    await initializeDirectoryStructure();
    res.json({
      message: 'Directory structure initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initializing directory structure:', error);
    res.status(500).json({error: 'Failed to initialize directory structure'});
  }
});

// OpenAPI specification endpoint
router.get('/spec/swagger.json', async (req, res) => {
  const swaggerPath = path.join(__dirname, '../../openapi/swagger.json');
  
  try {
    const swaggerSpec = await filing.read(swaggerPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  } catch (error) {
    console.error('Error serving OpenAPI specification:', error);
    res.status(500).json({ error: 'Failed to load API specification' });
  }
});

module.exports = router;