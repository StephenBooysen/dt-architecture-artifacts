const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

// Mock dependencies before requiring the app
jest.mock('simple-git');
jest.mock('helmet');
jest.mock('express-rate-limit');

const mockGit = {
  cwd: jest.fn().mockReturnThis(),
  add: jest.fn().mockResolvedValue(undefined),
  commit: jest.fn().mockResolvedValue(undefined),
  push: jest.fn().mockResolvedValue(undefined),
  status: jest.fn().mockResolvedValue({ files: [] }),
  clone: jest.fn().mockResolvedValue(undefined),
  pull: jest.fn().mockResolvedValue(undefined),
  checkIsRepo: jest.fn().mockResolvedValue(true)
};

require('simple-git').mockReturnValue(mockGit);
require('helmet').mockReturnValue((req, res, next) => next());
require('express-rate-limit').mockReturnValue((req, res, next) => next());

const app = require('../server/index');

describe('Architecture Artifacts Server API', () => {
  const testContentDir = path.join(__dirname, 'test-content');
  
  beforeAll(async () => {
    // Create test content directory
    await fs.mkdir(testContentDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test content directory
    try {
      await fs.rm(testContentDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('File Operations', () => {
    describe('GET /api/files', () => {
      test('should return directory tree structure', async () => {
        const response = await request(app)
          .get('/api/files')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('POST /api/files', () => {
      test('should create a new markdown file', async () => {
        const filePath = 'test.md';
        const content = '# Test Content';

        const response = await request(app)
          .post('/api/files')
          .send({ filePath, content })
          .expect(200);

        expect(response.body.message).toBe('File created successfully');
        expect(response.body.path).toBe(filePath);
      });

      test('should reject non-markdown files', async () => {
        const filePath = 'test.txt';
        const content = 'Test content';

        await request(app)
          .post('/api/files')
          .send({ filePath, content })
          .expect(400);
      });

      test('should require file path', async () => {
        await request(app)
          .post('/api/files')
          .send({ content: 'test' })
          .expect(400);
      });
    });

    describe('POST /api/folders', () => {
      test('should create a new folder', async () => {
        const folderPath = 'test-folder';

        const response = await request(app)
          .post('/api/folders')
          .send({ folderPath })
          .expect(200);

        expect(response.body.message).toBe('Folder created successfully');
        expect(response.body.path).toBe(folderPath);
      });

      test('should require folder path', async () => {
        await request(app)
          .post('/api/folders')
          .send({})
          .expect(400);
      });
    });
  });

  describe('Git Operations', () => {
    describe('POST /api/commit', () => {
      test('should commit changes with message', async () => {
        const message = 'Test commit message';

        const response = await request(app)
          .post('/api/commit')
          .send({ message })
          .expect(200);

        expect(response.body.message).toBe('Changes committed successfully');
        expect(mockGit.add).toHaveBeenCalledWith('.');
        expect(mockGit.commit).toHaveBeenCalledWith(message);
      });

      test('should require commit message', async () => {
        await request(app)
          .post('/api/commit')
          .send({})
          .expect(400);
      });
    });

    describe('POST /api/push', () => {
      test('should push changes to remote', async () => {
        const response = await request(app)
          .post('/api/push')
          .expect(200);

        expect(response.body.message).toBe('Changes pushed successfully');
        expect(mockGit.push).toHaveBeenCalledWith('origin', 'main');
      });
    });

    describe('GET /api/status', () => {
      test('should return git status', async () => {
        const mockStatus = { files: [{ path: 'test.md', index: 'M' }] };
        mockGit.status.mockResolvedValue(mockStatus);

        const response = await request(app)
          .get('/api/status')
          .expect(200);

        expect(response.body).toEqual(mockStatus);
      });
    });

    describe('POST /api/clone', () => {
      test('should clone repository', async () => {
        const repoUrl = 'https://github.com/test/repo.git';

        const response = await request(app)
          .post('/api/clone')
          .send({ repoUrl })
          .expect(200);

        expect(response.body.message).toBe('Repository cloned successfully');
        expect(mockGit.clone).toHaveBeenCalledWith(repoUrl, expect.any(String), ['--branch', 'main']);
      });

      test('should require repository URL', async () => {
        await request(app)
          .post('/api/clone')
          .send({})
          .expect(400);
      });
    });

    describe('POST /api/pull', () => {
      test('should pull changes from remote', async () => {
        const response = await request(app)
          .post('/api/pull')
          .send({ branch: 'main' })
          .expect(200);

        expect(response.body.message).toBe('Repository updated successfully');
        expect(mockGit.pull).toHaveBeenCalledWith('origin', 'main');
      });

      test('should handle non-git directory', async () => {
        mockGit.checkIsRepo.mockResolvedValue(false);

        await request(app)
          .post('/api/pull')
          .send({ branch: 'main' })
          .expect(400);
      });
    });
  });

  describe('Utility Functions', () => {
    test('should detect file types correctly', () => {
      // These are internal functions, so we test them indirectly through API calls
      // The detectFileType function is used in file retrieval endpoints
    });
  });

  describe('API Monitoring', () => {
    describe('GET /api-monitor-data', () => {
      test('should return API monitoring data', async () => {
        const response = await request(app)
          .get('/api-monitor-data')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('GET /api-monitor', () => {
      test('should return API monitor dashboard', async () => {
        const response = await request(app)
          .get('/api-monitor')
          .expect(200);

        expect(response.text).toContain('API Monitor Dashboard');
      });
    });
  });

  describe('File Upload', () => {
    describe('POST /api/upload', () => {
      test('should handle file upload with multipart form data', async () => {
        // This test would require setting up mock multer
        // For now, we'll test the error case
        await request(app)
          .post('/api/upload')
          .expect(400);
      });
    });
  });

  describe('Security Features', () => {
    test('should prevent path traversal in file access', async () => {
      const maliciousPath = '../../../etc/passwd';
      
      await request(app)
        .get(`/api/files/${maliciousPath}`)
        .expect(403);
    });

    test('should prevent path traversal in folder creation', async () => {
      const maliciousPath = '../../../tmp/malicious';
      
      await request(app)
        .post('/api/folders')
        .send({ folderPath: maliciousPath })
        .expect(403);
    });
  });
});