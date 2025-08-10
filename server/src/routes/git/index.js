/**
 * @fileoverview Git operations routes
 * 
 * Provides Git version control functionality including:
 * - Repository initialization and cloning
 * - Commit, push, and pull operations
 * - Branch management and merging
 * - File status and diff tracking
 * - Integration with filing service providers
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

const express = require('express');
const path = require('path');
const simpleGit = require('simple-git');
const EventEmitter = require('events');
const createFilingService = require('../../services/filing/index.js');

const router = express.Router();
const git = simpleGit();

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

/** @const {string} Path to the markdown files directory */
const contentDir = path.join(__dirname, '../../../../content', 'markdown');

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

// Git operations - Updated to use filing provider
router.post('/commit', requireAuth, async (req, res) => {
  try {
    const {message} = req.body;
    if (!message) {
      return res.status(400).json({error: 'Commit message is required'});
    }

    // Use the filing provider's publish method which handles drafts and requires a message
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

router.post('/push', async (req, res) => {
  try {
    // Note: The Git filing provider's publish() method already pushes changes
    // This endpoint now provides information about push status
    res.json({
      message: 'Push operations are handled automatically by commit endpoint',
      note: 'Use /api/git/commit to commit and push changes simultaneously'
    });
  } catch (error) {
    console.error('Error with push operation:', error);
    res.status(500).json({error: 'Failed to handle push request'});
  }
});

router.get('/status', async (req, res) => {
  try {
    await git.cwd(contentDir);
    const status = await git.status();
    res.json(status);
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({error: 'Failed to get git status'});
  }
});

router.post('/clone', async (req, res) => {
  try {
    const {repoUrl, branch = 'main'} = req.body;
    if (!repoUrl) {
      return res.status(400).json({error: 'Repository URL is required'});
    }

    await ensureContentDir();
    
    // Clear existing content directory
    const items = await filing.list(contentDir);
    for (const item of items) {
      await filing.delete(path.join(contentDir, item));
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

router.post('/pull', async (req, res) => {
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

// Draft management endpoints for Git filing provider
router.get('/drafts', requireAuth, async (req, res) => {
  try {
    // Get list of draft files from the Git filing provider
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
    // Discard all draft changes and reset to remote state
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

// Enhanced status endpoint that includes draft information
router.get('/git-status', async (req, res) => {
  try {
    // Get draft files from filing provider
    const draftFiles = await filing.getDraftFiles();
    
    // Get traditional git status for additional info
    await git.cwd(contentDir);
    const gitStatus = await git.status();
    
    res.json({
      drafts: {
        files: draftFiles,
        count: draftFiles.length,
        hasDrafts: draftFiles.length > 0
      },
      git: gitStatus,
      repository: {
        url: filing.options.repo,
        branch: filing.options.branch,
        localPath: filing.options.localPath
      }
    });
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({error: 'Failed to get git status'});
  }
});

// Last sync info endpoint for efficient polling
router.get('/sync-status', async (req, res) => {
  try {
    // Get the last sync time from the Git provider if available
    let lastSync = null;
    let hasRemoteChanges = false;
    
    if (filing.lastRemoteSync) {
      lastSync = filing.lastRemoteSync;
    }
    
    res.json({
      lastSync,
      hasRemoteChanges,
      provider: filing.constructor.name.includes('Git') ? 'git' : 'local'
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({error: 'Failed to get sync status'});
  }
});

// Filing provider info endpoint
router.get('/provider-info', async (req, res) => {
  try {
    // Determine provider type based on filing service instance
    const providerType = filing.constructor.name.includes('Git') ? 'git' : 'local';
    
    res.json({
      provider: providerType,
      supportsDrafts: providerType === 'git',
      supportsCommits: providerType === 'git',
      info: {
        type: providerType,
        description: providerType === 'git' 
          ? 'Git-based filing with draft tracking and version control'
          : 'Local filesystem with immediate saves (no drafts)'
      }
    });
  } catch (error) {
    console.error('Error getting provider info:', error);
    res.status(500).json({error: 'Failed to get provider info'});
  }
});

module.exports = router;