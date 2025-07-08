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

export default api;