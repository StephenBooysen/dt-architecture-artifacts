import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;