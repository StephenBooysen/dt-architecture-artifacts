/**
 * @fileoverview File and folder rename routes
 * 
 * Provides rename functionality for files and directories including:
 * - Safe file and folder renaming operations
 * - Path validation and conflict resolution
 * - Integration with filing service providers
 * - Support for batch rename operations
 * - Backwards compatibility with legacy structures
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

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

// Rename file/folder
router.put('/*', async (req, res) => {
  try {
    const oldPath = req.params[0] || '';
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

    // Check if new path already exists (using markdown prefix)
    const oldMarkdownPath = `markdown/${oldPath}`;
    const newMarkdownPath = `markdown/${path.relative(contentDir, newFullPath)}`;
    const newPathExists = await filing.exists(newMarkdownPath);
    if (newPathExists) {
      return res.status(409).json({error: 'A file or folder with that name already exists'});
    }

    // Perform the rename
    await filing.move(oldMarkdownPath, newMarkdownPath);
    
    const newPath = path.relative(contentDir, newFullPath);
    res.json({message: 'Item renamed successfully', oldPath, newPath});
  } catch (error) {
    console.error('Error renaming item:', error);
    res.status(500).json({error: 'Failed to rename item'});
  }
});

module.exports = router;