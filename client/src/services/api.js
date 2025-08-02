/**
 * @fileoverview API service module for Architecture Artifacts application.
 * 
 * This module provides a comprehensive API client for communicating with the
 * Architecture Artifacts backend. It includes functions for file management,
 * and content manipulation with proper error handling.
 * 
 * Key features:
 * - File CRUD operations (create, read, update, delete)
 * - File upload and download functionality
 * - Folder management operations
 * - Centralized axios configuration
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for authentication
});

// Add a response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or show auth modal
      const authEvent = new CustomEvent('authRequired', { 
        detail: { error: error.response.data } 
      });
      window.dispatchEvent(authEvent);
    }
    return Promise.reject(error);
  }
);

/**
 * Fetches the file tree structure from the API.
 * @param {string} [space] - Optional space name for space-aware requests.
 * @return {Promise<Array>} The file tree data.
 */
export const fetchFiles = async (space = null) => {
  try {
    const url = space ? `/${space}/files` : '/files';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching files:', error);
    throw error;
  }
};

/**
 * Fetches a specific file's content from the API.
 * @param {string} filePath - The path to the file.
 * @param {string} [space] - Optional space name for space-aware requests.
 * @return {Promise<Object>} The file data.
 */
export const fetchFile = async (filePath, space = null) => {
  try {
    const url = space ? `/${space}/files/${filePath}` : `/files/${filePath}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching file:', error);
    throw error;
  }
};

/**
 * Downloads a file from the server.
 * @param {string} filePath - The path to the file.
 * @return {Promise<void>} Downloads the file.
 */
export const downloadFile = async (filePath) => {
  try {
    const response = await api.get(`/download/${filePath}`, {
      responseType: 'blob'
    });
    
    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filePath.split('/').pop());
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Saves a file's content to the API.
 * @param {string} filePath - The path to the file.
 * @param {string} content - The file content to save.
 * @return {Promise<Object>} The save response.
 */
export const saveFile = async (filePath, content, space = null) => {
  try {
    const url = space ? `/${space}/files/${filePath}` : `/files/${filePath}`;
    const response = await api.put(url, {content});
    return response.data;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};


/**
 * Creates a new folder.
 * @param {string} folderPath - The path for the new folder.
 * @return {Promise<Object>} The create folder response.
 */
export const createFolder = async (folderPath, space = null) => {
  try {
    const url = space ? `/${space}/folders` : '/folders';
    const response = await api.post(url, {folderPath});
    return response.data;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

/**
 * Creates a new file.
 * @param {string} filePath - The path for the new file.
 * @param {string} content - The initial content for the file.
 * @return {Promise<Object>} The create file response.
 */
export const createFile = async (filePath, content = '', space = null) => {
  try {
    const url = space ? `/${space}/files/${filePath}` : `/files/${filePath}`;
    const response = await api.post(url, {content});
    return response.data;
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
};


/**
 * Deletes a file or folder.
 * @param {string} itemPath - The path of the file or folder to delete.
 * @return {Promise<Object>} The delete response.
 */
export const deleteItem = async (itemPath, space = null) => {
  try {
    const url = space ? `/${space}/files/${itemPath}` : `/files/${itemPath}`;
    const response = await api.delete(url);
    return response.data;
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

/**
 * Renames a file or folder.
 * @param {string} itemPath - The current path of the file or folder.
 * @param {string} newName - The new name for the item.
 * @return {Promise<Object>} The rename response.
 */
export const renameItem = async (itemPath, newName, space = null) => {
  try {
    const url = space ? `/${space}/rename/${itemPath}` : `/rename/${itemPath}`;
    const response = await api.put(url, {newName});
    return response.data;
  } catch (error) {
    console.error('Error renaming item:', error);
    throw error;
  }
};

/**
 * Fetches all available templates.
 * @return {Promise<Array>} The templates array.
 */
export const fetchTemplates = async (space = null) => {
  try {
    const url = space ? `/${space}/templates` : '/templates';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

/**
 * Fetches a specific template's content.
 * @param {string} templateName - The name of the template.
 * @return {Promise<Object>} The template data.
 */
export const fetchTemplate = async (templateName) => {
  try {
    const response = await api.get(`/templates/${templateName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
};

/**
 * Creates a new template.
 * @param {Object} templateData - The template data.
 * @param {string} templateData.name - The template name.
 * @param {string} templateData.content - The template content.
 * @param {string} templateData.description - The template description.
 * @return {Promise<Object>} The create response.
 */
export const createTemplate = async (templateData) => {
  try {
    const response = await api.post('/templates', templateData);
    return response.data;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

/**
 * Updates an existing template.
 * @param {string} templateName - The current template name.
 * @param {Object} templateData - The updated template data.
 * @return {Promise<Object>} The update response.
 */
export const updateTemplate = async (templateName, templateData) => {
  try {
    const response = await api.put(`/templates/${templateName}`, templateData);
    return response.data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

/**
 * Deletes a template.
 * @param {string} templateName - The name of the template to delete.
 * @return {Promise<Object>} The delete response.
 */
export const deleteTemplate = async (templateName) => {
  try {
    const response = await api.delete(`/templates/${templateName}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

/**
 * Creates a new file from a template with placeholder replacement.
 * @param {string} templateName - The name of the template to use.
 * @param {string} filePath - The path where the new file should be created.
 * @param {Object} customVariables - Optional custom variables to replace in template.
 * @return {Promise<Object>} The creation response.
 */
export const createFileFromTemplate = async (templateName, filePath, customVariables = {}) => {
  try {
    const response = await api.post(`/templates/${templateName}/create-file`, {
      filePath,
      customVariables
    });
    return response.data;
  } catch (error) {
    console.error('Error creating file from template:', error);
    throw error;
  }
};

/**
 * Searches for files by name.
 * @param {string} query - The search query.
 * @return {Promise<Array>} Array of file suggestions.
 */
export const searchFiles = async (query) => {
  try {
    const response = await api.get(`/search/files?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error('Error searching files:', error);
    throw error;
  }
};

/**
 * Searches for content within files.
 * @param {string} query - The search query.
 * @return {Promise<Array>} Array of content search results.
 */
export const searchContent = async (query) => {
  try {
    const response = await api.get(`/search/content?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error('Error searching content:', error);
    throw error;
  }
};

/**
 * Authentication API functions
 */

/**
 * Registers a new user.
 * @param {Object} userData - The user registration data.
 * @param {string} userData.username - The username.
 * @param {string} userData.password - The password.
 * @return {Promise<Object>} The registration response.
 */
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

/**
 * Logs in a user.
 * @param {Object} credentials - The login credentials.
 * @param {string} credentials.username - The username.
 * @param {string} credentials.password - The password.
 * @return {Promise<Object>} The login response.
 */
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

/**
 * Logs out the current user.
 * @return {Promise<Object>} The logout response.
 */
export const logoutUser = async () => {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

/**
 * Gets the current user information.
 * @return {Promise<Object>} The current user data.
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

/**
 * Gets all users (admin only).
 * @return {Promise<Array>} Array of users.
 */
export const getAllUsers = async () => {
  try {
    const response = await api.get('/auth/users');
    return response.data;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

/**
 * Comment management functions
 */

/**
 * Gets all comments for a specific file.
 * @param {string} filePath - The path to the file.
 * @return {Promise<Object>} The comments data.
 */
export const getComments = async (filePath) => {
  try {
    const response = await api.get(`/comments/${filePath}`);
    return response.data;
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

/**
 * Adds a new comment to a file.
 * @param {string} filePath - The path to the file.
 * @param {string} content - The comment content.
 * @return {Promise<Object>} The response with new comment and updated list.
 */
export const addComment = async (filePath, content) => {
  try {
    const response = await api.post(`/comments/${filePath}`, { content });
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Updates an existing comment.
 * @param {string} filePath - The path to the file.
 * @param {string} commentId - The ID of the comment to update.
 * @param {string} content - The updated comment content.
 * @return {Promise<Object>} The response with updated comment and list.
 */
export const updateComment = async (filePath, commentId, content) => {
  try {
    const response = await api.put(`/comments/${commentId}/${filePath}`, { content });
    return response.data;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

/**
 * Deletes a comment.
 * @param {string} filePath - The path to the file.
 * @param {string} commentId - The ID of the comment to delete.
 * @return {Promise<Object>} The response with updated comment list.
 */
export const deleteComment = async (filePath, commentId) => {
  try {
    const response = await api.delete(`/comments/${commentId}/${filePath}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

/**
 * Recent files and starred files management functions
 */

/**
 * Gets recent files (edited within specified days).
 * @param {number} days - Number of days to look back (default: 7).
 * @return {Promise<Object>} The recent files data.
 */
export const getRecentFiles = async (days = 7) => {
  try {
    const response = await api.get(`/metadata/recent?days=${days}`);
    return response.data;
  } catch (error) {
    console.error('Error getting recent files:', error);
    throw error;
  }
};

/**
 * Gets starred files.
 * @return {Promise<Object>} The starred files data.
 */
export const getStarredFiles = async () => {
  try {
    const response = await api.get('/metadata/starred');
    return response.data;
  } catch (error) {
    console.error('Error getting starred files:', error);
    throw error;
  }
};

/**
 * Toggles the starred status of a file.
 * @param {string} filePath - The path to the file.
 * @param {boolean} starred - The new starred status (optional, toggles if not provided).
 * @return {Promise<Object>} The response with updated starred status.
 */
export const toggleStarredFile = async (filePath, starred = null) => {
  try {
    const body = starred !== null ? { starred } : {};
    const response = await api.post(`/starred/${filePath}`, body);
    return response.data;
  } catch (error) {
    console.error('Error toggling starred status:', error);
    throw error;
  }
};

/**
 * Gets metadata for a specific file.
 * @param {string} filePath - The path to the file.
 * @return {Promise<Object>} The file metadata.
 */
export const getFileMetadata = async (filePath) => {
  try {
    const response = await api.get(`/metadata/${filePath}`);
    return response.data;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
};

/**
 * Fetches the user's allowed spaces.
 * @return {Promise<Array>} The user's allowed spaces data.
 */
export const fetchUserSpaces = async () => {
  try {
    const response = await api.get('/user/spaces');
    return response.data;
  } catch (error) {
    console.error('Error fetching user spaces:', error);
    throw error;
  }
};

export default api;