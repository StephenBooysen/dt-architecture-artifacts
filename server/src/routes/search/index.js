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

// Search files by name
router.get('/files', async (req, res) => {
  try {
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
router.get('/content', async (req, res) => {
  try {
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