/**
 * @fileoverview Server-side metadata parsing utilities for markdown files.
 * 
 * This module provides functions to extract, inject, and manage metadata
 * embedded within markdown files using HTML comment blocks. Metadata includes
 * recent edit history and starred status, stored as JSON data within HTML comments.
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2025-01-01
 */

const METADATA_START_MARKER = '<!-- METADATA_DATA_START';
const METADATA_END_MARKER = 'METADATA_DATA_END -->';

/**
 * Extracts metadata from markdown content.
 * 
 * Searches for the metadata block in the markdown content
 * and parses the JSON data to return the metadata object.
 * 
 * @param {string} markdownContent - The markdown content containing embedded metadata
 * @return {Object} Metadata object with recent edits and starred status
 */
function extractMetadata(markdownContent) {
  if (!markdownContent || typeof markdownContent !== 'string') {
    return createDefaultMetadata();
  }

  const startIndex = markdownContent.indexOf(METADATA_START_MARKER);
  const endIndex = markdownContent.indexOf(METADATA_END_MARKER);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return createDefaultMetadata();
  }

  try {
    // Extract the JSON content between markers
    const jsonStart = startIndex + METADATA_START_MARKER.length;
    const jsonContent = markdownContent.substring(jsonStart, endIndex).trim();
    
    const metadata = JSON.parse(jsonContent);
    return {
      ...createDefaultMetadata(),
      ...metadata
    };
  } catch (error) {
    console.error('Error parsing metadata from markdown:', error);
    return createDefaultMetadata();
  }
}

/**
 * Gets the markdown content without the metadata block.
 * 
 * Removes the embedded metadata block from the markdown content,
 * returning only the user-editable content.
 * 
 * @param {string} markdownContent - The markdown content with embedded metadata
 * @return {string} Clean markdown content without metadata block
 */
function getCleanMarkdownContentWithoutMetadata(markdownContent) {
  if (!markdownContent || typeof markdownContent !== 'string') {
    return markdownContent || '';
  }

  const startIndex = markdownContent.indexOf(METADATA_START_MARKER);
  
  if (startIndex === -1) {
    return markdownContent;
  }

  // Return content up to the metadata block, trimming trailing whitespace
  return markdownContent.substring(0, startIndex).trimEnd();
}

/**
 * Injects metadata into markdown content.
 * 
 * Takes clean markdown content and metadata object, then combines
 * them by appending the metadata block to the end of the markdown.
 * 
 * @param {string} cleanMarkdownContent - The markdown content without metadata
 * @param {Object} metadata - Metadata object to embed
 * @return {string} Complete markdown content with embedded metadata
 */
function injectMetadata(cleanMarkdownContent, metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return cleanMarkdownContent || '';
  }

  const metadataWithDefaults = {
    ...createDefaultMetadata(),
    ...metadata,
    version: '1.0',
    lastUpdated: new Date().toISOString()
  };

  const metadataBlock = `\n\n${METADATA_START_MARKER}\n${JSON.stringify(metadataWithDefaults, null, 2)}\n${METADATA_END_MARKER}`;
  
  return (cleanMarkdownContent || '') + metadataBlock;
}

/**
 * Creates a default metadata object.
 * 
 * @return {Object} Default metadata structure
 */
function createDefaultMetadata() {
  return {
    recentEdits: [],
    starred: false,
    version: '1.0',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Adds a recent edit entry to metadata.
 * 
 * @param {Object} metadata - Current metadata object
 * @param {string} username - Username of the editor
 * @param {string} timestamp - ISO timestamp of the edit (optional, defaults to now)
 * @return {Object} Updated metadata with new recent edit
 */
function addRecentEdit(metadata, username, timestamp = null) {
  if (!metadata || typeof metadata !== 'object') {
    metadata = createDefaultMetadata();
  }

  if (!username || typeof username !== 'string') {
    throw new Error('Username is required for recent edit tracking');
  }

  const editTimestamp = timestamp || new Date().toISOString();
  
  const newEdit = {
    id: generateEditId(),
    username: username,
    timestamp: editTimestamp,
    date: editTimestamp
  };

  // Keep only the last 20 recent edits, sorted by newest first
  const updatedEdits = [newEdit, ...(metadata.recentEdits || [])]
    .slice(0, 20)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    ...metadata,
    recentEdits: updatedEdits,
    lastUpdated: editTimestamp
  };
}

/**
 * Toggles the starred status of a file.
 * 
 * @param {Object} metadata - Current metadata object
 * @param {boolean} starred - New starred status (optional, toggles if not provided)
 * @return {Object} Updated metadata with new starred status
 */
function toggleStarred(metadata, starred = null) {
  if (!metadata || typeof metadata !== 'object') {
    metadata = createDefaultMetadata();
  }

  const newStarredStatus = starred !== null ? starred : !metadata.starred;
  
  return {
    ...metadata,
    starred: newStarredStatus,
    starredAt: newStarredStatus ? new Date().toISOString() : null,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Gets recent edits within a specified number of days.
 * 
 * @param {Object} metadata - Metadata object
 * @param {number} days - Number of days to look back (default: 7)
 * @return {Array} Array of recent edits within the time period
 */
function getRecentEditsWithinDays(metadata, days = 7) {
  if (!metadata || !Array.isArray(metadata.recentEdits)) {
    return [];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return metadata.recentEdits.filter(edit => {
    const editDate = new Date(edit.timestamp);
    return editDate >= cutoffDate;
  });
}

/**
 * Checks if a file has been edited recently (within specified days).
 * 
 * @param {Object} metadata - Metadata object
 * @param {number} days - Number of days to look back (default: 7)
 * @return {boolean} True if file has recent edits
 */
function hasRecentEdits(metadata, days = 7) {
  const recentEdits = getRecentEditsWithinDays(metadata, days);
  return recentEdits.length > 0;
}

/**
 * Gets the most recent edit from metadata.
 * 
 * @param {Object} metadata - Metadata object
 * @return {Object|null} Most recent edit object or null if no edits
 */
function getMostRecentEdit(metadata) {
  if (!metadata || !Array.isArray(metadata.recentEdits) || metadata.recentEdits.length === 0) {
    return null;
  }

  return metadata.recentEdits[0]; // Array is already sorted by newest first
}

/**
 * Generates a unique edit ID.
 * 
 * @return {string} Unique edit ID
 */
function generateEditId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 9);
  return `edit_${timestamp}_${randomStr}`;
}

/**
 * Validates metadata structure.
 * 
 * @param {Object} metadata - Metadata object to validate
 * @return {boolean} True if metadata is valid
 */
function isValidMetadata(metadata) {
  return metadata &&
         typeof metadata === 'object' &&
         Array.isArray(metadata.recentEdits) &&
         typeof metadata.starred === 'boolean' &&
         typeof metadata.version === 'string';
}

/**
 * Cleans up old recent edits (older than 30 days).
 * 
 * @param {Object} metadata - Metadata object
 * @return {Object} Metadata with cleaned up recent edits
 */
function cleanupOldEdits(metadata) {
  if (!metadata || !Array.isArray(metadata.recentEdits)) {
    return metadata;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep edits for 30 days

  const cleanedEdits = metadata.recentEdits.filter(edit => {
    const editDate = new Date(edit.timestamp);
    return editDate >= cutoffDate;
  });

  return {
    ...metadata,
    recentEdits: cleanedEdits,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = {
  extractMetadata,
  getCleanMarkdownContentWithoutMetadata,
  injectMetadata,
  createDefaultMetadata,
  addRecentEdit,
  toggleStarred,
  getRecentEditsWithinDays,
  hasRecentEdits,
  getMostRecentEdit,
  isValidMetadata,
  cleanupOldEdits
};