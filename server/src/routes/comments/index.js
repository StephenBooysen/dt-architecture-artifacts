const express = require('express');
const path = require('path');
const EventEmitter = require('events');
const createFilingService = require('../../services/filing/index.js');

const router = express.Router();

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

// Comment management endpoints
const {
  extractComments,
  getCleanMarkdownContent,
  injectComments,
  addComment,
  removeComment,
  updateComment,
  sortCommentsByNewest,
  isValidComment
} = require('../../utils/commentParser');

// Get comments for a specific file
router.get('/*', async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    // Check if file exists and is a markdown file
    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    const markdownFilePath = `markdown/${filePath}`;
    const content = await filing.read(markdownFilePath, 'utf8');
    const comments = extractComments(content);
    const sortedComments = sortCommentsByNewest(comments);
    
    res.json({
      filePath,
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error getting comments:', error);
    res.status(500).json({error: 'Failed to get comments'});
  }
});

// Add a new comment to a file
router.post('/*', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const { content: commentContent } = req.body;
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    if (!commentContent || typeof commentContent !== 'string' || !commentContent.trim()) {
      return res.status(400).json({error: 'Comment content is required'});
    }

    // Read the current file content
    const markdownFilePathForRead = `markdown/${filePath}`;
    const markdownContent = await filing.read(markdownFilePathForRead, 'utf8');
    
    // Extract existing comments and clean content
    const existingComments = extractComments(markdownContent);
    const cleanContent = getCleanMarkdownContent(markdownContent);
    
    // Add the new comment
    const newComment = {
      author: req.user.username,
      content: commentContent.trim()
    };
    
    const updatedComments = addComment(existingComments, newComment);
    
    // Inject comments back into the content
    const updatedMarkdownContent = injectComments(cleanContent, updatedComments);
    
    // Save the updated content
    const markdownFilePathForUpdate = `markdown/${filePath}`;
    await filing.update(markdownFilePathForUpdate, updatedMarkdownContent); // Use relative path with markdown prefix
    
    // Return the new comment and updated list
    const sortedComments = sortCommentsByNewest(updatedComments);
    const newCommentData = sortedComments.find(c => c.author === req.user.username && c.content === commentContent.trim());
    
    res.json({
      message: 'Comment added successfully',
      comment: newCommentData,
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error adding comment:', error);
    res.status(500).json({error: 'Failed to add comment'});
  }
});

// Update an existing comment
router.put('/:commentId/*', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const commentId = req.params.commentId;
    const { content: commentContent } = req.body;
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    if (!commentContent || typeof commentContent !== 'string' || !commentContent.trim()) {
      return res.status(400).json({error: 'Comment content is required'});
    }

    // Read the current file content
    const markdownFilePathForRead = `markdown/${filePath}`;
    const markdownContent = await filing.read(markdownFilePathForRead, 'utf8');
    
    // Extract existing comments and clean content
    const existingComments = extractComments(markdownContent);
    const cleanContent = getCleanMarkdownContent(markdownContent);
    
    // Find the comment to update
    const commentToUpdate = existingComments.find(c => c.id === commentId);
    if (!commentToUpdate) {
      return res.status(404).json({error: 'Comment not found'});
    }

    // Check if user can update this comment (only author can update)
    if (commentToUpdate.author !== req.user.username) {
      return res.status(403).json({error: 'You can only update your own comments'});
    }
    
    // Update the comment
    const updatedComments = updateComment(existingComments, commentId, {
      content: commentContent.trim()
    });
    
    // Inject comments back into the content
    const updatedMarkdownContent = injectComments(cleanContent, updatedComments);
    
    // Save the updated content
    const markdownFilePathForUpdate = `markdown/${filePath}`;
    await filing.update(markdownFilePathForUpdate, updatedMarkdownContent); // Use relative path with markdown prefix
    
    // Return the updated comment and list
    const sortedComments = sortCommentsByNewest(updatedComments);
    const updatedComment = sortedComments.find(c => c.id === commentId);
    
    res.json({
      message: 'Comment updated successfully',
      comment: updatedComment,
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error updating comment:', error);
    res.status(500).json({error: 'Failed to update comment'});
  }
});

// Delete a comment
router.delete('/:commentId/*', requireAuth, async (req, res) => {
  try {
    const filePath = req.params[0] || '';
    const commentId = req.params.commentId;
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Comments are only supported for markdown files'});
    }

    // Read the current file content
    const markdownFilePathForRead = `markdown/${filePath}`;
    const markdownContent = await filing.read(markdownFilePathForRead, 'utf8');
    
    // Extract existing comments and clean content
    const existingComments = extractComments(markdownContent);
    const cleanContent = getCleanMarkdownContent(markdownContent);
    
    // Find the comment to delete
    const commentToDelete = existingComments.find(c => c.id === commentId);
    if (!commentToDelete) {
      return res.status(404).json({error: 'Comment not found'});
    }

    // Check if user can delete this comment (only author can delete)
    if (commentToDelete.author !== req.user.username) {
      return res.status(403).json({error: 'You can only delete your own comments'});
    }
    
    // Remove the comment
    const updatedComments = removeComment(existingComments, commentId);
    
    // Inject comments back into the content (or just clean content if no comments left)
    const updatedMarkdownContent = updatedComments.length > 0 
      ? injectComments(cleanContent, updatedComments)
      : cleanContent;
    
    // Save the updated content
    const markdownFilePathForUpdate = `markdown/${filePath}`;
    await filing.update(markdownFilePathForUpdate, updatedMarkdownContent); // Use relative path with markdown prefix
    
    // Return the updated list
    const sortedComments = sortCommentsByNewest(updatedComments);
    
    res.json({
      message: 'Comment deleted successfully',
      comments: sortedComments,
      commentCount: sortedComments.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({error: 'File not found'});
    }
    console.error('Error deleting comment:', error);
    res.status(500).json({error: 'Failed to delete comment'});
  }
});

module.exports = router;