/**
 * @fileoverview URL utilities for parsing and constructing routes in the Design Artifacts Editor.
 * 
 * This module provides utilities for parsing URL paths into space, folder, and file components,
 * as well as constructing URLs from these components. It handles the routing structure:
 * - /{space} - Space home view
 * - /{space}/folder/path - Folder content view
 * - /{space}/path/to/file.md - File editor view
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Parses a URL path into its components (space, folder path, file name).
 * @param {string} pathname - The URL pathname to parse (e.g., "/Personal/docs/readme.md")
 * @returns {Object} Parsed URL components
 * @returns {string} returns.space - The space name (e.g., "Personal")
 * @returns {string} returns.path - The full path after space (e.g., "docs/readme.md")
 * @returns {string} returns.folderPath - The folder path (e.g., "docs")
 * @returns {string} returns.fileName - The file name if it's a file (e.g., "readme.md")
 * @returns {string} returns.type - Either "space", "folder", or "file"
 */
export const parseURL = (pathname) => {
  // Remove leading slash and split by /
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return {
      space: null,
      path: '',
      folderPath: '',
      fileName: null,
      type: 'root'
    };
  }
  
  const space = segments[0];
  const pathSegments = segments.slice(1);
  const fullPath = pathSegments.join('/');
  
  if (pathSegments.length === 0) {
    // Just space, no path
    return {
      space,
      path: '',
      folderPath: '',
      fileName: null,
      type: 'space'
    };
  }
  
  const lastSegment = pathSegments[pathSegments.length - 1];
  const isFile = lastSegment && (lastSegment.endsWith('.md') || lastSegment.includes('.'));
  
  if (isFile) {
    // It's a file
    const folderSegments = pathSegments.slice(0, -1);
    return {
      space,
      path: fullPath,
      folderPath: folderSegments.join('/'),
      fileName: lastSegment,
      type: 'file'
    };
  } else {
    // It's a folder
    return {
      space,
      path: fullPath,
      folderPath: fullPath,
      fileName: null,
      type: 'folder'
    };
  }
};

/**
 * Constructs a URL path from space and file/folder path components.
 * @param {string} space - The space name
 * @param {string} [path=''] - The file or folder path within the space
 * @returns {string} The constructed URL path
 */
export const constructURL = (space, path = '') => {
  if (!space) return '/';
  
  const cleanPath = path.replace(/^\//, '').replace(/\/$/, '');
  return cleanPath ? `/${space}/${cleanPath}` : `/${space}`;
};

/**
 * Constructs a URL for a specific file.
 * @param {string} space - The space name
 * @param {string} filePath - The file path
 * @returns {string} The constructed file URL
 */
export const constructFileURL = (space, filePath) => {
  return constructURL(space, filePath);
};

/**
 * Constructs a URL for a specific folder.
 * @param {string} space - The space name
 * @param {string} folderPath - The folder path
 * @returns {string} The constructed folder URL
 */
export const constructFolderURL = (space, folderPath) => {
  return constructURL(space, folderPath);
};

/**
 * Constructs a URL for a space home view.
 * @param {string} space - The space name
 * @returns {string} The constructed space URL
 */
export const constructSpaceURL = (space) => {
  return `/${space}`;
};

/**
 * Extracts the folder path from a file path.
 * @param {string} filePath - The file path (e.g., "docs/api/readme.md")
 * @returns {string} The folder path (e.g., "docs/api")
 */
export const getParentFolderPath = (filePath) => {
  const segments = filePath.split('/');
  if (segments.length <= 1) return '';
  return segments.slice(0, -1).join('/');
};

/**
 * Checks if a path represents a file (has file extension).
 * @param {string} path - The path to check
 * @returns {boolean} True if it's a file path
 */
export const isFilePath = (path) => {
  if (!path) return false;
  const lastSegment = path.split('/').pop();
  return lastSegment && lastSegment.includes('.');
};

/**
 * Checks if a path represents a markdown file.
 * @param {string} path - The path to check
 * @returns {boolean} True if it's a markdown file path
 */
export const isMarkdownFile = (path) => {
  return path && (path.endsWith('.md') || path.endsWith('.markdown'));
};

/**
 * Gets the file name from a file path.
 * @param {string} filePath - The file path
 * @returns {string} The file name
 */
export const getFileName = (filePath) => {
  if (!filePath) return '';
  return filePath.split('/').pop() || '';
};

/**
 * Gets the folder name from a folder path.
 * @param {string} folderPath - The folder path
 * @returns {string} The folder name
 */
export const getFolderName = (folderPath) => {
  if (!folderPath) return '';
  return folderPath.split('/').pop() || '';
};

/**
 * Normalizes a path by removing leading/trailing slashes and empty segments.
 * @param {string} path - The path to normalize
 * @returns {string} The normalized path
 */
export const normalizePath = (path) => {
  if (!path) return '';
  return path.split('/').filter(Boolean).join('/');
};