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

// Performance metrics storage (in-memory for 5 minutes)
const performanceHistory = [];
const MAX_HISTORY_LENGTH = 60; // 5 minutes of data at 5-second intervals

// Function to collect current performance metrics
function collectPerformanceMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    timestamp: Date.now(),
    memory: {
      rss: memUsage.rss, // Resident Set Size
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: process.uptime(),
    activeHandles: process._getActiveHandles().length,
    activeRequests: process._getActiveRequests().length
  };
}

// Initialize performance monitoring
let lastCpuUsage = process.cpuUsage();
let performanceInterval;

function startPerformanceMonitoring() {
  performanceInterval = setInterval(() => {
    const currentCpuUsage = process.cpuUsage(lastCpuUsage);
    const metrics = collectPerformanceMetrics();
    
    // Calculate CPU percentage
    const totalCpuTime = currentCpuUsage.user + currentCpuUsage.system;
    const cpuPercent = (totalCpuTime / (5 * 1000 * 1000)) * 100; // 5 seconds in microseconds
    
    metrics.cpu.percent = Math.min(100, Math.max(0, cpuPercent));
    lastCpuUsage = process.cpuUsage();
    
    performanceHistory.push(metrics);
    
    // Keep only last 5 minutes of data
    if (performanceHistory.length > MAX_HISTORY_LENGTH) {
      performanceHistory.shift();
    }
  }, 5000); // Collect every 5 seconds
}

// Start monitoring when module loads
startPerformanceMonitoring();

// Performance metrics endpoint
router.get('/performance', (req, res) => {
  try {
    const currentMetrics = collectPerformanceMetrics();
    const currentCpuUsage = process.cpuUsage(lastCpuUsage);
    const totalCpuTime = currentCpuUsage.user + currentCpuUsage.system;
    const cpuPercent = Math.min(100, Math.max(0, (totalCpuTime / (1000 * 1000)) * 20)); // Rough estimate
    
    currentMetrics.cpu.percent = cpuPercent;
    
    res.json({
      current: currentMetrics,
      history: performanceHistory,
      summary: {
        avgMemoryUsage: performanceHistory.length > 0 
          ? performanceHistory.reduce((sum, m) => sum + m.memory.heapUsed, 0) / performanceHistory.length 
          : currentMetrics.memory.heapUsed,
        avgCpuUsage: performanceHistory.length > 0 
          ? performanceHistory.reduce((sum, m) => sum + (m.cpu.percent || 0), 0) / performanceHistory.length 
          : cpuPercent,
        avgActiveHandles: performanceHistory.length > 0 
          ? performanceHistory.reduce((sum, m) => sum + m.activeHandles, 0) / performanceHistory.length 
          : currentMetrics.activeHandles
      }
    });
  } catch (error) {
    console.error('Error collecting performance metrics:', error);
    res.status(500).json({ error: 'Failed to collect performance metrics' });
  }
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