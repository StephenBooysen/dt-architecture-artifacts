import { api } from '../client/src/services/api';
import axios from 'axios';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

const mockedAxios = axios;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Operations', () => {
    test('should fetch files list', async () => {
      const mockFiles = [
        { name: 'test.md', type: 'file', fileType: 'markdown' }
      ];
      mockedAxios.get.mockResolvedValue({ data: mockFiles });

      const result = await api.getFiles();
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/files');
      expect(result).toEqual(mockFiles);
    });

    test('should fetch file content', async () => {
      const mockContent = { content: '# Test', fileType: 'markdown' };
      mockedAxios.get.mockResolvedValue({ data: mockContent });

      const result = await api.getFileContent('test.md');
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/files/test.md');
      expect(result).toEqual(mockContent);
    });

    test('should save file content', async () => {
      const mockResponse = { message: 'File saved successfully' };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await api.saveFile('test.md', '# New Content');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/files/test.md', {
        content: '# New Content'
      });
      expect(result).toEqual(mockResponse);
    });

    test('should create new file', async () => {
      const mockResponse = { message: 'File created successfully' };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await api.createFile('new-file.md', '# New File');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/files', {
        filePath: 'new-file.md',
        content: '# New File'
      });
      expect(result).toEqual(mockResponse);
    });

    test('should delete file', async () => {
      const mockResponse = { message: 'File deleted successfully' };
      mockedAxios.delete.mockResolvedValue({ data: mockResponse });

      const result = await api.deleteFile('test.md');
      
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/files/test.md');
      expect(result).toEqual(mockResponse);
    });

    test('should rename file', async () => {
      const mockResponse = { message: 'Item renamed successfully' };
      mockedAxios.put.mockResolvedValue({ data: mockResponse });

      const result = await api.renameItem('old-name.md', 'new-name.md');
      
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/rename/old-name.md', {
        newName: 'new-name.md'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Folder Operations', () => {
    test('should create folder', async () => {
      const mockResponse = { message: 'Folder created successfully' };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await api.createFolder('new-folder');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/folders', {
        folderPath: 'new-folder'
      });
      expect(result).toEqual(mockResponse);
    });

    test('should delete folder', async () => {
      const mockResponse = { message: 'Folder deleted successfully' };
      mockedAxios.delete.mockResolvedValue({ data: mockResponse });

      const result = await api.deleteFolder('test-folder');
      
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/folders/test-folder');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Git Operations', () => {
    test('should get git status', async () => {
      const mockStatus = { files: [], current: 'main' };
      mockedAxios.get.mockResolvedValue({ data: mockStatus });

      const result = await api.getGitStatus();
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/status');
      expect(result).toEqual(mockStatus);
    });

    test('should commit changes', async () => {
      const mockResponse = { message: 'Changes committed successfully' };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await api.commitChanges('Test commit message');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/commit', {
        message: 'Test commit message'
      });
      expect(result).toEqual(mockResponse);
    });

    test('should push changes', async () => {
      const mockResponse = { message: 'Changes pushed successfully' };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await api.pushChanges();
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/push');
      expect(result).toEqual(mockResponse);
    });

    test('should clone repository', async () => {
      const mockResponse = { message: 'Repository cloned successfully' };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await api.cloneRepository('https://github.com/test/repo.git', 'main');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/clone', {
        repoUrl: 'https://github.com/test/repo.git',
        branch: 'main'
      });
      expect(result).toEqual(mockResponse);
    });

    test('should pull changes', async () => {
      const mockResponse = { message: 'Repository updated successfully' };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await api.pullChanges('main');
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/pull', {
        branch: 'main'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('File Upload', () => {
    test('should upload file', async () => {
      const mockResponse = { message: 'File uploaded successfully' };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.txt'));
      formData.append('folderPath', 'uploads');

      const result = await api.uploadFile(formData);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(api.getFiles()).rejects.toThrow('Network Error');
    });

    test('should handle API errors', async () => {
      const apiError = {
        response: {
          status: 404,
          data: { error: 'File not found' }
        }
      };
      mockedAxios.get.mockRejectedValue(apiError);

      await expect(api.getFileContent('nonexistent.md')).rejects.toMatchObject(apiError);
    });
  });
});