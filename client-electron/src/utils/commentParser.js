/**
 * @fileoverview Comment parsing utilities for markdown files.
 * 
 * This module provides functions to extract, inject, and manage comments
 * embedded within markdown files using HTML comment blocks. Comments are
 * stored as JSON data within HTML comments at the end of markdown files.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-01-01
 */

const COMMENT_START_MARKER = '<!-- COMMENTS_DATA_START';
const COMMENT_END_MARKER = 'COMMENTS_DATA_END -->';

/**
 * Extracts comments from markdown content.
 * 
 * Searches for the comment block at the end of the markdown content
 * and parses the JSON data to return the comments array.
 * 
 * @param {string} markdownContent - The markdown content containing embedded comments
 * @return {Array} Array of comment objects, empty array if no comments found
 */
export function extractComments(markdownContent) {
  if (!markdownContent || typeof markdownContent !== 'string') {
    return [];
  }

  const startIndex = markdownContent.indexOf(COMMENT_START_MARKER);
  const endIndex = markdownContent.indexOf(COMMENT_END_MARKER);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return [];
  }

  try {
    // Extract the JSON content between markers
    const jsonStart = startIndex + COMMENT_START_MARKER.length;
    const jsonContent = markdownContent.substring(jsonStart, endIndex).trim();
    
    const commentData = JSON.parse(jsonContent);
    return commentData.comments || [];
  } catch (error) {
    console.error('Error parsing comments from markdown:', error);
    return [];
  }
}

/**
 * Gets the markdown content without the comment block.
 * 
 * Removes the embedded comment block from the markdown content,
 * returning only the user-editable content.
 * 
 * @param {string} markdownContent - The markdown content with embedded comments
 * @return {string} Clean markdown content without comment block
 */
export function getCleanMarkdownContent(markdownContent) {
  if (!markdownContent || typeof markdownContent !== 'string') {
    return markdownContent || '';
  }

  // Remove both comment blocks and metadata blocks to get clean content
  let cleanContent = markdownContent;
  
  // Remove comment block
  const commentStartIndex = cleanContent.indexOf(COMMENT_START_MARKER);
  if (commentStartIndex !== -1) {
    cleanContent = cleanContent.substring(0, commentStartIndex).trimEnd();
  }
  
  // Remove metadata block (from metadataParser)
  const metadataStartMarker = '<!-- METADATA_DATA_START';
  const metadataStartIndex = cleanContent.indexOf(metadataStartMarker);
  if (metadataStartIndex !== -1) {
    cleanContent = cleanContent.substring(0, metadataStartIndex).trimEnd();
  }

  return cleanContent;
}

/**
 * Injects comments into markdown content.
 * 
 * Takes clean markdown content and an array of comments, then combines
 * them by appending the comment block to the end of the markdown.
 * 
 * @param {string} cleanMarkdownContent - The markdown content without comments
 * @param {Array} comments - Array of comment objects to embed
 * @return {string} Complete markdown content with embedded comments
 */
export function injectComments(cleanMarkdownContent, comments) {
  if (!Array.isArray(comments) || comments.length === 0) {
    return cleanMarkdownContent || '';
  }

  const commentData = {
    comments: comments,
    version: '1.0'
  };

  const commentBlock = `\n\n${COMMENT_START_MARKER}\n${JSON.stringify(commentData, null, 2)}\n${COMMENT_END_MARKER}`;
  
  return (cleanMarkdownContent || '') + commentBlock;
}

/**
 * Adds a new comment to existing comments array.
 * 
 * Creates a new comment object with the provided data and adds it
 * to the comments array. Generates a unique ID and timestamp.
 * 
 * @param {Array} existingComments - Current array of comments
 * @param {Object} newComment - New comment data
 * @param {string} newComment.author - Comment author username
 * @param {string} newComment.content - Comment text content
 * @return {Array} Updated comments array with new comment added
 */
export function addComment(existingComments, newComment) {
  if (!Array.isArray(existingComments)) {
    existingComments = [];
  }

  if (!newComment || !newComment.author || !newComment.content) {
    throw new Error('Comment must have author and content');
  }

  const comment = {
    id: generateCommentId(),
    author: newComment.author,
    content: newComment.content,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  return [...existingComments, comment];
}

/**
 * Removes a comment by ID from comments array.
 * 
 * @param {Array} existingComments - Current array of comments
 * @param {string} commentId - ID of comment to remove
 * @return {Array} Updated comments array with comment removed
 */
export function removeComment(existingComments, commentId) {
  if (!Array.isArray(existingComments)) {
    return [];
  }

  return existingComments.filter(comment => comment.id !== commentId);
}

/**
 * Updates an existing comment by ID.
 * 
 * @param {Array} existingComments - Current array of comments
 * @param {string} commentId - ID of comment to update
 * @param {Object} updates - Fields to update
 * @return {Array} Updated comments array with comment modified
 */
export function updateComment(existingComments, commentId, updates) {
  if (!Array.isArray(existingComments)) {
    return [];
  }

  return existingComments.map(comment => {
    if (comment.id === commentId) {
      return {
        ...comment,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    }
    return comment;
  });
}

/**
 * Generates a unique comment ID.
 * 
 * Creates a unique identifier for comments using timestamp and random string.
 * 
 * @return {string} Unique comment ID
 */
function generateCommentId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 9);
  return `comment_${timestamp}_${randomStr}`;
}

/**
 * Sorts comments by timestamp (newest first).
 * 
 * @param {Array} comments - Array of comments to sort
 * @return {Array} Sorted comments array
 */
export function sortCommentsByNewest(comments) {
  if (!Array.isArray(comments)) {
    return [];
  }

  return [...comments].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.createdAt);
    const dateB = new Date(b.timestamp || b.createdAt);
    return dateB - dateA; // Newest first
  });
}

/**
 * Validates comment data structure.
 * 
 * @param {Object} comment - Comment object to validate
 * @return {boolean} True if comment is valid
 */
export function isValidComment(comment) {
  return comment &&
         typeof comment === 'object' &&
         typeof comment.id === 'string' &&
         typeof comment.author === 'string' &&
         typeof comment.content === 'string' &&
         typeof comment.timestamp === 'string';
}