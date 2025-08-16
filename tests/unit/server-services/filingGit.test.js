const FilingGitProvider = require('../../server/src/services/filing/providers/filingGit');
const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('events');

// Mock simple-git
jest.mock('simple-git', () => {
  const mockGit = {
    checkIsRepo: jest.fn(),
    pull: jest.fn(),
    clone: jest.fn(),
    checkout: jest.fn(),
    fetch: jest.fn(),
    add: jest.fn(),
    commit: jest.fn(),
    push: jest.fn(),
    reset: jest.fn()
  };
  
  return jest.fn(() => mockGit);
});

const simpleGit = require('simple-git');

describe('FilingGitProvider', () => {
  let provider;
  let eventEmitter;
  let mockGit;
  let testOptions;
  const testRepoUrl = 'https://github.com/StephenBooysen/dt-architecture-artifacts-testing.git';
  const testLocalPath = path.join(__dirname, 'test-git-repo');

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    mockGit = simpleGit();
    
    testOptions = {
      repo: testRepoUrl,
      localPath: testLocalPath,
      branch: 'main',
      username: 'testuser',
      password: 'testpass',
      fetchInterval: 1000 // 1 second for testing
    };

    // Clear all mocks
    Object.values(mockGit).forEach(mock => mock.mockClear());
    
    // Mock fs operations
    jest.spyOn(fs, 'pathExists').mockResolvedValue(false);
    jest.spyOn(fs, 'ensureDir').mockResolvedValue();
    jest.spyOn(fs, 'writeFile').mockResolvedValue();
    jest.spyOn(fs, 'readFile').mockResolvedValue('test content');
    jest.spyOn(fs, 'readdir').mockResolvedValue(['file1.txt', 'file2.txt']);
    jest.spyOn(fs, 'remove').mockResolvedValue();
    jest.spyOn(fs, 'copy').mockResolvedValue();
    jest.spyOn(fs, 'move').mockResolvedValue();
    jest.spyOn(fs, 'stat').mockResolvedValue({
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date(),
      ctime: new Date(),
      atime: new Date(),
      mode: 0o644
    });
  });

  afterEach(async () => {
    if (provider) {
      provider.destroy();
    }
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should throw error if required options are missing', () => {
      expect(() => {
        new FilingGitProvider({}, eventEmitter);
      }).toThrow('Git provider requires repo, localPath, and branch options.');
    });

    it('should initialize with correct options', () => {
      provider = new FilingGitProvider(testOptions, eventEmitter);
      
      expect(provider.options.repo).toBe(testRepoUrl);
      expect(provider.options.localPath).toBe(testLocalPath);
      expect(provider.options.branch).toBe('main');
      expect(provider.draftFiles).toBeInstanceOf(Set);
      expect(provider.draftFiles.size).toBe(0);
    });

    it('should clone repository if it does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);
      
      provider = new FilingGitProvider(testOptions, eventEmitter);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(testLocalPath));
      expect(simpleGit().clone).toHaveBeenCalledWith(
        expect.stringContaining('testuser:testpass'),
        testLocalPath
      );
      expect(mockGit.checkout).toHaveBeenCalledWith('main');
    });

    it('should pull if repository already exists', async () => {
      fs.pathExists.mockResolvedValue(true);
      mockGit.checkIsRepo.mockResolvedValue(true);
      
      provider = new FilingGitProvider(testOptions, eventEmitter);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockGit.pull).toHaveBeenCalled();
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      fs.pathExists.mockResolvedValue(true);
      mockGit.checkIsRepo.mockResolvedValue(true);
      provider = new FilingGitProvider(testOptions, eventEmitter);
    });

    it('should create file and mark as draft', async () => {
      const filePath = 'test.txt';
      const content = 'Hello World';

      await provider.create(filePath, content);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(testLocalPath, filePath),
        content
      );
      expect(provider.draftFiles.has(filePath)).toBe(true);
    });

    it('should read file with encoding', async () => {
      const filePath = 'test.txt';
      const encoding = 'utf8';

      const result = await provider.read(filePath, encoding);

      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(testLocalPath, filePath),
        encoding
      );
      expect(result).toBe('test content');
    });

    it('should update file and mark as draft', async () => {
      const filePath = 'test.txt';
      const content = 'Updated content';

      await provider.update(filePath, content);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(testLocalPath, filePath),
        content
      );
      expect(provider.draftFiles.has(filePath)).toBe(true);
    });

    it('should delete file and mark as draft', async () => {
      const filePath = 'test.txt';

      await provider.delete(filePath);

      expect(fs.remove).toHaveBeenCalledWith(path.join(testLocalPath, filePath));
      expect(provider.draftFiles.has(filePath)).toBe(true);
    });

    it('should list directory contents', async () => {
      const dirPath = 'testdir';

      const result = await provider.list(dirPath);

      expect(fs.readdir).toHaveBeenCalledWith(path.join(testLocalPath, dirPath));
      expect(result).toEqual(['file1.txt', 'file2.txt']);
    });

    it('should check if file exists', async () => {
      const filePath = 'test.txt';
      fs.pathExists.mockResolvedValue(true);

      const result = await provider.exists(filePath);

      expect(fs.pathExists).toHaveBeenCalledWith(path.join(testLocalPath, filePath));
      expect(result).toBe(true);
    });

    it('should copy file and mark destination as draft', async () => {
      const sourcePath = 'source.txt';
      const destPath = 'dest.txt';

      await provider.copy(sourcePath, destPath);

      expect(fs.copy).toHaveBeenCalledWith(
        path.join(testLocalPath, sourcePath),
        path.join(testLocalPath, destPath)
      );
      expect(provider.draftFiles.has(destPath)).toBe(true);
    });

    it('should move file and mark both paths as draft', async () => {
      const sourcePath = 'source.txt';
      const destPath = 'dest.txt';

      await provider.move(sourcePath, destPath);

      expect(fs.move).toHaveBeenCalledWith(
        path.join(testLocalPath, sourcePath),
        path.join(testLocalPath, destPath)
      );
      expect(provider.draftFiles.has(sourcePath)).toBe(true);
      expect(provider.draftFiles.has(destPath)).toBe(true);
    });
  });

  describe('Git Operations', () => {
    beforeEach(() => {
      fs.pathExists.mockResolvedValue(true);
      mockGit.checkIsRepo.mockResolvedValue(true);
      provider = new FilingGitProvider(testOptions, eventEmitter);
    });

    it('should publish changes and clear draft files', async () => {
      // Add some draft files
      provider.draftFiles.add('file1.txt');
      provider.draftFiles.add('file2.txt');
      
      const commitMessage = 'Test commit';
      const mockCommitSummary = { commit: 'abc123' };
      
      mockGit.commit.mockResolvedValue(mockCommitSummary);

      const result = await provider.publish(commitMessage);

      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith(commitMessage);
      expect(mockGit.push).toHaveBeenCalledWith('origin', 'main');
      expect(provider.draftFiles.size).toBe(0);
      expect(result).toEqual({ commit: mockCommitSummary });
    });

    it('should throw error when publish fails', async () => {
      const commitMessage = 'Test commit';
      const error = new Error('Git push failed');
      
      mockGit.push.mockRejectedValue(error);

      await expect(provider.publish(commitMessage)).rejects.toThrow('Publish failed: Git push failed');
    });

    it('should require commit message for publish', async () => {
      await expect(provider.publish()).rejects.toThrow('A comment is required to publish changes.');
    });

    it('should discard drafts by resetting to remote', async () => {
      // Add some draft files
      provider.draftFiles.add('file1.txt');
      provider.draftFiles.add('file2.txt');

      await provider.discardDrafts();

      expect(mockGit.fetch).toHaveBeenCalled();
      expect(mockGit.reset).toHaveBeenCalledWith(['--hard', 'origin/main']);
      expect(provider.draftFiles.size).toBe(0);
    });

    it('should return list of draft files', async () => {
      provider.draftFiles.add('file1.txt');
      provider.draftFiles.add('file2.txt');

      const drafts = await provider.getDraftFiles();

      expect(drafts).toEqual(['file1.txt', 'file2.txt']);
    });
  });

  describe('Event Emission', () => {
    beforeEach(() => {
      fs.pathExists.mockResolvedValue(true);
      mockGit.checkIsRepo.mockResolvedValue(true);
      provider = new FilingGitProvider(testOptions, eventEmitter);
    });

    it('should emit events for file operations', async () => {
      const createSpy = jest.fn();
      const readSpy = jest.fn();
      const updateSpy = jest.fn();
      
      eventEmitter.on('filing:create', createSpy);
      eventEmitter.on('filing:read', readSpy);
      eventEmitter.on('filing:update', updateSpy);

      await provider.create('test.txt', 'content');
      await provider.read('test.txt');
      await provider.update('test.txt', 'new content');

      expect(createSpy).toHaveBeenCalledWith({
        filePath: 'test.txt',
        content: 'content',
        isDraft: true
      });
      expect(readSpy).toHaveBeenCalledWith({
        filePath: 'test.txt',
        content: 'test content',
        isDraft: true
      });
      expect(updateSpy).toHaveBeenCalledWith({
        filePath: 'test.txt',
        content: 'new content',
        isDraft: true
      });
    });

    it('should handle null event emitter gracefully', async () => {
      const providerWithoutEmitter = new FilingGitProvider(testOptions, null);
      
      // Should not throw errors
      await expect(providerWithoutEmitter.create('test.txt', 'content')).resolves.not.toThrow();
    });
  });

  describe('Path Security', () => {
    beforeEach(() => {
      fs.pathExists.mockResolvedValue(true);
      mockGit.checkIsRepo.mockResolvedValue(true);
      provider = new FilingGitProvider(testOptions, eventEmitter);
    });

    it('should prevent path traversal attacks', async () => {
      const maliciousPath = '../../../etc/passwd';

      await expect(provider.read(maliciousPath)).rejects.toThrow('Access denied: Path traversal detected.');
    });

    it('should allow valid relative paths', async () => {
      const validPath = 'folder/file.txt';

      await expect(provider.read(validPath)).resolves.toBeDefined();
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(testLocalPath, validPath),
        undefined
      );
    });
  });

  describe('Periodic Fetch', () => {
    beforeEach(() => {
      fs.pathExists.mockResolvedValue(true);
      mockGit.checkIsRepo.mockResolvedValue(true);
    });

    it('should periodically fetch from remote', async () => {
      provider = new FilingGitProvider({
        ...testOptions,
        fetchInterval: 100 // 100ms for testing
      }, eventEmitter);

      // Wait for a couple of fetch cycles
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(mockGit.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle fetch errors gracefully', async () => {
      const fetchError = new Error('Network error');
      mockGit.fetch.mockRejectedValue(fetchError);
      
      const errorSpy = jest.fn();
      eventEmitter.on('FilingGitProvider:FetchFailed', errorSpy);

      provider = new FilingGitProvider({
        ...testOptions,
        fetchInterval: 100
      }, eventEmitter);

      // Wait for fetch to fail
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(errorSpy).toHaveBeenCalledWith({ error: 'Network error' });
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      provider = new FilingGitProvider(testOptions, eventEmitter);
      provider.destroy();

      expect(clearIntervalSpy).toHaveBeenCalledWith(provider.fetchIntervalId);
    });

    it('should cleanup properly', async () => {
      provider = new FilingGitProvider(testOptions, eventEmitter);
      const destroySpy = jest.spyOn(provider, 'destroy');
      
      await provider.cleanup();

      expect(destroySpy).toHaveBeenCalled();
    });
  });
});