/**
 * @fileoverview File type detection utilities for Architecture Artifacts.
 * 
 * This module provides comprehensive file type detection and classification
 * functionality based on file extensions. It supports various file types
 * including markdown, PDF, images, and text files with appropriate MIME
 * type mapping and viewing capabilities.
 * 
 * Key features:
 * - File type detection by extension
 * - MIME type resolution
 * - Viewability classification
 * - File name and extension extraction
 * - Support for markdown, PDF, image, and text files
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * File type definitions with their extensions and mime types
 */
export const FILE_TYPES = {
  MARKDOWN: 'markdown',
  PDF: 'pdf',
  IMAGE: 'image',
  TEXT: 'text',
  UNKNOWN: 'unknown'
};

/**
 * Image file extensions
 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];

/**
 * Text file extensions
 */
const TEXT_EXTENSIONS = ['.txt', '.json', '.xml', '.csv', '.log', '.js', '.ts', '.css', '.html', '.md'];

/**
 * PDF file extensions
 */
const PDF_EXTENSIONS = ['.pdf'];

/**
 * Markdown file extensions
 */
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

/**
 * Detects the file type based on the file path/extension
 * @param {string} filePath - The file path
 * @returns {string} The detected file type
 */
export function detectFileType(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return FILE_TYPES.UNKNOWN;
  }

  const extension = getFileExtension(filePath);

  if (MARKDOWN_EXTENSIONS.includes(extension)) {
    return FILE_TYPES.MARKDOWN;
  }

  if (PDF_EXTENSIONS.includes(extension)) {
    return FILE_TYPES.PDF;
  }

  if (IMAGE_EXTENSIONS.includes(extension)) {
    return FILE_TYPES.IMAGE;
  }

  if (TEXT_EXTENSIONS.includes(extension)) {
    return FILE_TYPES.TEXT;
  }

  return FILE_TYPES.UNKNOWN;
}

/**
 * Gets the file extension from a file path
 * @param {string} filePath - The file path
 * @returns {string} The file extension in lowercase
 */
export function getFileExtension(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  const lastDotIndex = filePath.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }

  return filePath.substring(lastDotIndex).toLowerCase();
}

/**
 * Gets the file name from a file path
 * @param {string} filePath - The file path
 * @returns {string} The file name
 */
export function getFileName(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  return filePath.split('/').pop() || '';
}

/**
 * Checks if a file type is supported for viewing
 * @param {string} fileType - The file type
 * @returns {boolean} Whether the file type is supported
 */
export function isViewableFileType(fileType) {
  return [FILE_TYPES.MARKDOWN, FILE_TYPES.PDF, FILE_TYPES.IMAGE, FILE_TYPES.TEXT].includes(fileType);
}

/**
 * Checks if a file type should be downloaded
 * @param {string} fileType - The file type
 * @returns {boolean} Whether the file should be downloaded
 */
export function shouldDownloadFile(fileType) {
  return fileType === FILE_TYPES.UNKNOWN;
}

/**
 * Gets the appropriate MIME type for a file extension
 * @param {string} extension - The file extension
 * @returns {string} The MIME type
 */
export function getMimeType(extension) {
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
    '.log': 'text/plain',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}