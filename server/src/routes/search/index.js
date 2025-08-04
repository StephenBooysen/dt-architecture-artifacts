/**
 * @fileoverview Search functionality API routes
 * 
 * Provides comprehensive search capabilities including:
 * - Full-text search across file contents
 * - File name and metadata search
 * - Authentication middleware for secure access
 * - Support for both session and token-based authentication
 * - Integration with filing service providers
 * - Advanced search filtering and result ranking
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
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

/**
 * Get space-aware filing provider for the current user
 */
async function getSpaceAwareFiling(req) {
  // Default to Personal space for search operations
  const spaceName = req.query.space || 'Personal';
  const user = req.user;
  
  if (!user) {
    throw new Error('User authentication required');
  }
  
  // Load spaces configuration to get the right provider
  const spacesPath = path.join(__dirname, '../../../../server-data/spaces.json');
  const spacesData = fs.readFileSync(spacesPath, 'utf8');
  const spaces = JSON.parse(spacesData);
  const spaceConfig = spaces.find(space => space.space === spaceName);
  
  if (!spaceConfig) {
    throw new Error(`Space '${spaceName}' not found`);
  }
  
  // Create filing provider based on space configuration
  const filingConfig = spaceConfig.filing;
  let provider;

  if (filingConfig.type === 'local') {
    provider = createFilingService('local', {
      localPath: filingConfig.localFolder
    }, new EventEmitter());
  } else if (filingConfig.type === 'git') {
    provider = createFilingService('git', {
      repo: filingConfig.git,
      localPath: filingConfig.localFolder,
      branch: filingConfig['git-branch'] || 'main',
      fetchInterval: parseInt(filingConfig['git-fetch-interval']) || 5000
    }, new EventEmitter());
  } else {
    throw new Error(`Unsupported filing provider type: ${filingConfig.type}`);
  }
  
  // Set user context for Personal space isolation
  if (provider.setUserContext && typeof provider.setUserContext === 'function') {
    provider.setUserContext(user, spaceName);
  }
  
  return provider;
}

// Search files by name
router.get('/files', requireAuth, async (req, res) => {
  try {
    const filing = await getSpaceAwareFiling(req);
    const query = req.query.q;
    if (!query) {
      return res.json([]);
    }

    const searchResults = [];
    
    // Recursive function to search through files in markdown directory
    const searchInDirectory = async (dirPath) => {
      try {
        const markdownDirPath = dirPath ? `markdown/${dirPath}` : 'markdown';
        const items = await filing.listDetailed(markdownDirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath || '', item.name);
          const relativePath = fullPath;
          
          if (item.isDirectory) {
            await searchInDirectory(fullPath);
          } else if (item.isFile && item.name.endsWith('.md')) {
            // Check if filename contains the search query (case insensitive)
            if (item.name.toLowerCase().includes(query.toLowerCase())) {
              searchResults.push({
                name: item.name,
                path: relativePath.replace(/\\/g, '/'),
                type: 'file'
              });
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.error('Error reading directory:', dirPath, error.message);
      }
    };

    await searchInDirectory('');
    
    res.json(searchResults.slice(0, 10)); // Limit results
  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({error: 'Failed to search files'});
  }
});

// Search content within files
router.get('/content', requireAuth, async (req, res) => {
  try {
    const filing = await getSpaceAwareFiling(req);
    const query = req.query.q;
    if (!query) {
      return res.json([]);
    }

    const searchResults = [];
    const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    // Recursive function to search through file contents in markdown directory
    const searchInDirectory = async (dirPath) => {
      try {
        const markdownDirPath = dirPath ? `markdown/${dirPath}` : 'markdown';
        const items = await filing.listDetailed(markdownDirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath || '', item.name);
          const relativePath = fullPath;
          
          if (item.isDirectory) {
            await searchInDirectory(fullPath);
          } else if (item.isFile && item.name.endsWith('.md')) {
            try {
              const markdownFilePath = `markdown/${fullPath}`;
              const content = await filing.read(markdownFilePath, 'utf8');
              const matches = [];
              let match;
              
              // Find all matches in the content
              while ((match = searchRegex.exec(content)) !== null) {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(content.length, match.index + query.length + 50);
                const preview = content.substring(start, end);
                
                // Highlight the matched text
                const highlightedPreview = preview.replace(
                  searchRegex, 
                  `<mark>$&</mark>`
                );
                
                matches.push({
                  fileName: item.name,
                  filePath: relativePath.replace(/\\/g, '/'),
                  preview: (start > 0 ? '...' : '') + highlightedPreview + (end < content.length ? '...' : ''),
                  matchIndex: match.index
                });
                
                // Limit matches per file
                if (matches.length >= 3) break;
              }
              
              if (matches.length > 0) {
                searchResults.push(...matches);
              }
            } catch (error) {
              // Skip files that can't be read
              console.error('Error reading file:', fullPath, error.message);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.error('Error reading directory:', dirPath, error.message);
      }
    };

    await searchInDirectory('');
    
    // Sort by relevance (files with more matches first)
    searchResults.sort((a, b) => {
      const aCount = (a.preview.match(/<mark>/g) || []).length;
      const bCount = (b.preview.match(/<mark>/g) || []).length;
      return bCount - aCount;
    });
    
    res.json(searchResults.slice(0, 20)); // Limit results
  } catch (error) {
    console.error('Error searching content:', error);
    res.status(500).json({error: 'Failed to search content'});
  }
});

module.exports = router;