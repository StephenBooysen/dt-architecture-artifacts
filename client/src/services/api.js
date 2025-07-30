/**
 * @fileoverview API service module for Architecture Artifacts application.
 * 
 * This module provides a comprehensive API client for communicating with the
 * Architecture Artifacts backend. It includes functions for file management,
 * Git operations, and content manipulation with proper error handling.
 * 
 * Key features:
 * - File CRUD operations (create, read, update, delete)
 * - Git integration (commit, push, pull, clone, status)
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
 * @return {Promise<Array>} The file tree data.
 */
export const fetchFiles = async () => {
  try {
    const response = await api.get('/files');
    return response.data;
  } catch (error) {
    console.error('Error fetching files:', error);
    throw error;
  }
};

/**
 * Fetches a specific file's content from the API.
 * @param {string} filePath - The path to the file.
 * @return {Promise<Object>} The file data.
 */
export const fetchFile = async (filePath) => {
  try {
    const response = await api.get(`/files/${filePath}`);
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
export const saveFile = async (filePath, content) => {
  try {
    const response = await api.post(`/files/${filePath}`, {content});
    return response.data;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

/**
 * Commits changes to git with a message.
 * @param {string} message - The commit message.
 * @return {Promise<Object>} The commit response.
 */
export const commitChanges = async (message) => {
  try {
    const response = await api.post('/commit', {message});
    return response.data;
  } catch (error) {
    console.error('Error committing changes:', error);
    throw error;
  }
};

/**
 * Pushes committed changes to the remote repository.
 * @return {Promise<Object>} The push response.
 */
export const pushChanges = async () => {
  try {
    const response = await api.post('/push');
    return response.data;
  } catch (error) {
    console.error('Error pushing changes:', error);
    throw error;
  }
};

/**
 * Gets the current git status.
 * @return {Promise<Object>} The git status.
 */
export const getGitStatus = async () => {
  try {
    const response = await api.get('/status');
    return response.data;
  } catch (error) {
    console.error('Error getting git status:', error);
    throw error;
  }
};

/**
 * Creates a new folder.
 * @param {string} folderPath - The path for the new folder.
 * @return {Promise<Object>} The create folder response.
 */
export const createFolder = async (folderPath) => {
  try {
    const response = await api.post('/folders', {folderPath});
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
export const createFile = async (filePath, content = '') => {
  try {
    const response = await api.post('/files', {filePath, content});
    return response.data;
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
};

/**
 * Clones a git repository into the content directory.
 * @param {string} repoUrl - The repository URL to clone.
 * @param {string} branch - The branch to clone (default: 'main').
 * @return {Promise<Object>} The clone response.
 */
export const cloneRepository = async (repoUrl, branch = 'main') => {
  try {
    const response = await api.post('/clone', {repoUrl, branch});
    return response.data;
  } catch (error) {
    console.error('Error cloning repository:', error);
    throw error;
  }
};

/**
 * Pulls the latest changes from the remote repository.
 * @param {string} branch - The branch to pull (default: 'main').
 * @return {Promise<Object>} The pull response.
 */
export const pullRepository = async (branch = 'main') => {
  try {
    const response = await api.post('/pull', {branch});
    return response.data;
  } catch (error) {
    console.error('Error pulling repository:', error);
    throw error;
  }
};

/**
 * Deletes a file or folder.
 * @param {string} itemPath - The path of the file or folder to delete.
 * @return {Promise<Object>} The delete response.
 */
export const deleteItem = async (itemPath) => {
  try {
    const response = await api.delete(`/files/${itemPath}`);
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
export const renameItem = async (itemPath, newName) => {
  try {
    const response = await api.put(`/rename/${itemPath}`, {newName});
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
export const fetchTemplates = async () => {
  try {
    const response = await api.get('/templates');
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

export default api;