import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchFiles = async () => {
  try {
    const response = await api.get('/files');
    return response.data;
  } catch (error) {
    console.error('Error fetching files:', error);
    throw error;
  }
};

export const fetchFile = async (filePath) => {
  try {
    const response = await api.get(`/files/${filePath}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching file:', error);
    throw error;
  }
};

export const saveFile = async (filePath, content) => {
  try {
    const response = await api.post(`/files/${filePath}`, { content });
    return response.data;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

export const commitChanges = async (message) => {
  try {
    const response = await api.post('/commit', { message });
    return response.data;
  } catch (error) {
    console.error('Error committing changes:', error);
    throw error;
  }
};

export const pushChanges = async () => {
  try {
    const response = await api.post('/push');
    return response.data;
  } catch (error) {
    console.error('Error pushing changes:', error);
    throw error;
  }
};

export const getGitStatus = async () => {
  try {
    const response = await api.get('/status');
    return response.data;
  } catch (error) {
    console.error('Error getting git status:', error);
    throw error;
  }
};

export default api;