
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');

class FilingGitProvider {
  constructor(options, eventEmitter) {
    this.options = {
      fetchInterval: 300000, // 5 minutes
      ...options,
    };
    this.eventEmitter = eventEmitter;

    if (!this.options.repo || !this.options.localPath || !this.options.branch) {
      throw new Error('Git provider requires repo, localPath, and branch options.');
    }

    this.git = simpleGit(this.options.localPath);
    this._initializeRepo();

    this.fetchIntervalId = setInterval(() => this._periodicFetch(), this.options.fetchInterval);
    this.eventEmitter.emit('FilingGitProvider:Initialized', { localPath: this.options.localPath });
  }

  async _initializeRepo() {
    const remoteUrl = this._getAuthenticatedRepoUrl();
    const dirExists = await fs.pathExists(this.options.localPath);

    if (dirExists) {
        const isRepo = await this.git.checkIsRepo();
        if(isRepo) {
            this.eventEmitter.emit('FilingGitProvider:Pulling', { localPath: this.options.localPath });
            await this.git.pull(remoteUrl, this.options.branch);
            return;
        }
    }
    
    this.eventEmitter.emit('FilingGitProvider:Cloning', { repo: this.options.repo, localPath: this.options.localPath });
    await fs.ensureDir(path.dirname(this.options.localPath));
    await simpleGit().clone(remoteUrl, this.options.localPath);
    await this.git.checkout(this.options.branch);
  }

  _getAuthenticatedRepoUrl() {
    if (this.options.username && this.options.password) {
      const url = new URL(this.options.repo);
      url.username = this.options.username;
      url.password = this.options.password;
      return url.toString();
    }
    return this.options.repo;
  }

  async _periodicFetch() {
    try {
      await this.git.fetch();
      this.eventEmitter.emit('FilingGitProvider:FetchSuccess', {});
    } catch (error) {
      this.eventEmitter.emit('FilingGitProvider:FetchFailed', { error: error.message });
    }
  }

  _resolvePath(filePath) {
    // Prevent path traversal attacks
    const resolvedPath = path.join(this.options.localPath, filePath);
    if (!resolvedPath.startsWith(this.options.localPath)) {
        throw new Error('Access denied: Path traversal detected.');
    }
    return resolvedPath;
  }

  async create(filePath, content) {
    const absolutePath = this._resolvePath(filePath);
    await fs.ensureDir(path.dirname(absolutePath));
    return fs.writeFile(absolutePath, content);
  }

  async read(filePath) {
    const absolutePath = this._resolvePath(filePath);
    return fs.readFile(absolutePath, 'utf8');
  }

  async update(filePath, content) {
    return this.create(filePath, content); // writeFile overwrites
  }

  async delete(filePath) {
    const absolutePath = this._resolvePath(filePath);
    return fs.remove(absolutePath);
  }

  async list(dirPath) {
    const absolutePath = this._resolvePath(dirPath);
    return fs.readdir(absolutePath);
  }

  async publish(comment) {
    if (!comment) {
      throw new Error('A comment is required to publish changes.');
    }
    try {
      await this.git.add('.');
      const commitSummary = await this.git.commit(comment);
      this.eventEmitter.emit('FilingGitProvider:Committed', { summary: commitSummary });

      await this.git.push('origin', this.options.branch);
      this.eventEmitter.emit('FilingGitProvider:Pushed', { branch: this.options.branch });
      
      return { commit: commitSummary };
    } catch (error) {
      this.eventEmitter.emit('FilingGitProvider:PublishFailed', { error: error.message });
      throw new Error(`Publish failed: ${error.message}`);
    }
  }

  destroy() {
    if (this.fetchIntervalId) {
      clearInterval(this.fetchIntervalId);
    }
  }
}

module.exports = FilingGitProvider;
