
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const fsPromises = require('fs').promises;
const path = require('path');

class FilingGitProvider {
  constructor(options, eventEmitter) {
    this.options = {
      fetchInterval: 300000, // 5 minutes
      ...options,
    };
    this.eventEmitter_ = eventEmitter;
    this.draftFiles = new Set(); // Track files that are local drafts
    this.lastRemoteSync = null; // Track last time we pulled remote changes

    if (!this.options.repo || !this.options.localPath || !this.options.branch) {
      throw new Error('Git provider requires repo, localPath, and branch options.');
    }

    // Initialize git instance after ensuring the repo exists
    this._initializeRepo().catch(console.error);

    // Temporarily disabled to reduce error noise
    // this.fetchIntervalId = setInterval(() => this._periodicFetch(), this.options.fetchInterval);
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('FilingGitProvider:Initialized', { localPath: this.options.localPath });
    }
  }

  // Helper method to check if path exists
  async _pathExists(path) {
    try {
      await fsPromises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async _initializeRepo() {
    const remoteUrl = this._getAuthenticatedRepoUrl();
    const dirExists = await this._pathExists(this.options.localPath);

    // For readonly spaces, check if we have a valid repo before re-cloning
    if (this.options.isReadonly) {
      if (dirExists) {
        // Check if it's already a valid git repository with the correct remote
        const tempGit = simpleGit(this.options.localPath);
        try {
          const isRepo = await tempGit.checkIsRepo();
          if (isRepo) {
            const remotes = await tempGit.getRemotes(true);
            const originRemote = remotes.find(r => r.name === 'origin');
            if (originRemote && (originRemote.refs.fetch === this.options.repo || originRemote.refs.fetch === remoteUrl)) {
              console.log(`Using existing readonly space directory: ${this.options.localPath}`);
              this.git = tempGit;
              await this.git.checkout(this.options.branch);
              return;
            }
          }
        } catch (error) {
          console.log(`Invalid repository at ${this.options.localPath}, will re-clone:`, error.message);
        }
        
        // If we get here, the directory exists but doesn't have the right repo
        console.log(`Removing existing readonly space directory: ${this.options.localPath}`);
        await fs.remove(this.options.localPath);
      }
      
      if (this.eventEmitter_) {
        this.eventEmitter_.emit('FilingGitProvider:Cloning', { repo: this.options.repo, localPath: this.options.localPath });
      }
      await fs.ensureDir(path.dirname(this.options.localPath));
      await simpleGit().clone(remoteUrl, this.options.localPath);
      
      // Initialize git instance after cloning
      this.git = simpleGit(this.options.localPath);
      await this.git.checkout(this.options.branch);
      return;
    }

    // For writable spaces, use existing logic
    if (dirExists) {
        // Initialize git instance for existing directory
        this.git = simpleGit(this.options.localPath);
        const isRepo = await this.git.checkIsRepo();
        if(isRepo) {
            if (this.eventEmitter_) {
              this.eventEmitter_.emit('FilingGitProvider:Pulling', { localPath: this.options.localPath });
            }
            await this._handleDivergentBranches(remoteUrl);
            return;
        }
    }
    
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('FilingGitProvider:Cloning', { repo: this.options.repo, localPath: this.options.localPath });
    }
    await fs.ensureDir(path.dirname(this.options.localPath));
    await simpleGit().clone(remoteUrl, this.options.localPath);
    
    // Initialize git instance after cloning
    this.git = simpleGit(this.options.localPath);
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

  async _handleDivergentBranches(remote) {
    try {
      // For readonly spaces, use aggressive strategy to overwrite everything
      if (this.options.isReadonly) {
        console.log(`Aggressively updating readonly space: ${this.options.localPath}`);
        // Fetch all remote changes
        await this.git.fetch(remote, this.options.branch);
        // Hard reset to remote state, discarding all local changes
        await this.git.reset(['--hard', `${remote}/${this.options.branch}`]);
        // Clean untracked files
        await this.git.clean('f', ['-d']);
        return;
      }
      
      // For writable spaces, use the existing gentle approach
      // First, try to pull with merge strategy
      await this.git.pull(remote, this.options.branch, ['--no-rebase']);
    } catch (error) {
      if (error.message.includes('divergent branches') || error.message.includes('unrelated histories')) {
        if (this.options.isReadonly) {
          // For readonly spaces that are in a bad state, just reset everything
          try {
            await this.git.fetch(remote, this.options.branch);
            await this.git.reset(['--hard', `${remote}/${this.options.branch}`]);
            await this.git.clean('f', ['-d']);
          } catch (resetError) {
            // If reset fails, remove and re-clone
            console.log(`Reset failed for readonly space, re-cloning: ${this.options.localPath}`);
            await fs.remove(this.options.localPath);
            const remoteUrl = this._getAuthenticatedRepoUrl();
            await simpleGit().clone(remoteUrl, this.options.localPath);
            this.git = simpleGit(this.options.localPath);
            await this.git.checkout(this.options.branch);
          }
        } else {
          // For writable spaces, configure Git to use merge as default strategy
          await this.git.raw(['config', 'pull.rebase', 'false']);
          
          // Try again with explicit merge
          try {
            await this.git.pull(remote, this.options.branch, ['--strategy=recursive', '--strategy-option=ours']);
          } catch (secondError) {
            // If still failing, try a more aggressive approach
            await this.git.fetch(remote, this.options.branch);
            await this.git.merge([`${remote}/${this.options.branch}`, '--strategy=recursive', '--strategy-option=ours']);
          }
        }
      } else {
        throw error;
      }
    }
  }

  async _periodicFetch() {
    try {
      if (this.git) {
        // Fetch remote changes
        await this.git.fetch();
        
        // Check if there are remote changes to pull
        const status = await this.git.status();
        const behind = status.behind;
        
        if (behind > 0) {
          // Pull changes if we're behind
          await this._handleDivergentBranches('origin');
          this.lastRemoteSync = new Date().toISOString(); // Record sync time
          if (this.eventEmitter_) {
            this.eventEmitter_.emit('FilingGitProvider:PulledChanges', { 
              changesPulled: behind,
              message: this.options.isReadonly 
                ? `Aggressively synced ${behind} remote changes (readonly space)`
                : `Pulled ${behind} remote changes`,
              syncTime: this.lastRemoteSync
            });
          }
        }
        
        if (this.eventEmitter_) {
          this.eventEmitter_.emit('FilingGitProvider:FetchSuccess', { behind });
        }
      }
    } catch (error) {
      if (this.eventEmitter_) {
        this.eventEmitter_.emit('FilingGitProvider:FetchFailed', { error: error.message });
      }
    }
  }

  _resolvePath(filePath) {
    // Handle empty or current directory path
    if (!filePath || filePath === '.' || filePath === '') {
      return this.options.localPath;
    }
    
    // Prevent path traversal attacks
    const resolvedPath = path.resolve(path.join(this.options.localPath, filePath));
    const basePath = path.resolve(this.options.localPath);
    if (!resolvedPath.startsWith(basePath)) {
        throw new Error('Access denied: Path traversal detected.');
    }
    return resolvedPath;
  }

  _isDraft(filePath) {
    return this.draftFiles.has(filePath);
  }

  async _ensureGitReady() {
    if (!this.git) {
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!this.git) {
        throw new Error('Git instance not ready. Repository may still be initializing.');
      }
    }
  }

  async create(filePath, content) {
    const absolutePath = this._resolvePath(filePath);
    await fs.ensureDir(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, content);
    this.draftFiles.add(filePath);
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:create', { filePath, content, isDraft: true });
    }
  }

  async read(filePath, encoding) {
    const absolutePath = this._resolvePath(filePath);
    const content = await fs.readFile(absolutePath, encoding);
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:read', { 
        filePath, 
        content, 
        isDraft: this._isDraft(filePath) 
      });
    }
    return content;
  }

  async update(filePath, content) {
    const absolutePath = this._resolvePath(filePath);
    await fs.writeFile(absolutePath, content);
    this.draftFiles.add(filePath);
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:update', { 
        filePath, 
        content, 
        isDraft: true 
      });
    }
  }

  async delete(filePath) {
    const absolutePath = this._resolvePath(filePath);
    await fs.remove(absolutePath);
    this.draftFiles.add(filePath); // Mark as draft since it's a pending deletion
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:delete', { filePath, isDraft: true });
    }
  }

  async list(dirPath) {
    const absolutePath = this._resolvePath(dirPath);
    const files = await fs.readdir(absolutePath);
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:list', { dirPath, files });
    }
    return files;
  }

  async publish(comment) {
    if (!comment) {
      throw new Error('A comment is required to publish changes.');
    }
    try {
      await this._ensureGitReady();
      
      await this.git.add('.');
      const commitSummary = await this.git.commit(comment);
      if (this.eventEmitter_) {
        this.eventEmitter_.emit('FilingGitProvider:Committed', { summary: commitSummary });
      }

      await this.git.push('origin', this.options.branch);
      if (this.eventEmitter_) {
        this.eventEmitter_.emit('FilingGitProvider:Pushed', { branch: this.options.branch });
      }
      
      // Clear draft files that were committed
      this.draftFiles.clear();
      
      return { commit: commitSummary };
    } catch (error) {
      if (this.eventEmitter_) {
        this.eventEmitter_.emit('FilingGitProvider:PublishFailed', { error: error.message });
      }
      throw new Error(`Publish failed: ${error.message}`);
    }
  }

  async upload(filePath, content) {
    return this.create(filePath, content);
  }

  async download(filePath) {
    return this.read(filePath);
  }

  async remove(filePath) {
    return this.delete(filePath);
  }

  async exists(filePath) {
    const absolutePath = this._resolvePath(filePath);
    const exists = await this._pathExists(absolutePath);
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:exists', { 
        filePath, 
        exists,
        isDraft: this._isDraft(filePath)
      });
    }
    return exists;
  }

  async mkdir(dirPath, options = { recursive: true }) {
    const absolutePath = this._resolvePath(dirPath);
    await fs.ensureDir(absolutePath);
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:mkdir', { dirPath, options });
    }
  }

  async copy(sourcePath, destPath) {
    const sourceAbsolutePath = this._resolvePath(sourcePath);
    const destAbsolutePath = this._resolvePath(destPath);
    await fs.copy(sourceAbsolutePath, destAbsolutePath);
    this.draftFiles.add(destPath);
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:copy', { 
        sourcePath, 
        destPath, 
        isDraft: true 
      });
    }
  }

  async move(sourcePath, destPath) {
    const sourceAbsolutePath = this._resolvePath(sourcePath);
    const destAbsolutePath = this._resolvePath(destPath);
    await fs.move(sourceAbsolutePath, destAbsolutePath);
    this.draftFiles.add(destPath);
    this.draftFiles.add(sourcePath); // Mark source as draft (deleted)
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:move', { 
        sourcePath, 
        destPath, 
        isDraft: true 
      });
    }
  }

  async stat(filePath) {
    const absolutePath = this._resolvePath(filePath);
    const stats = await fs.stat(absolutePath);
    const result = {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mtime: stats.mtime,
      ctime: stats.ctime,
      atime: stats.atime,
      mode: stats.mode,
      isDraft: this._isDraft(filePath)
    };
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:stat', { filePath, stats: result });
    }
    return result;
  }

  async readdir(dirPath) {
    return this.listDetailed(dirPath);
  }

  async listDetailed(dirPath) {
    const absolutePath = this._resolvePath(dirPath);
    const files = await fs.readdir(absolutePath);
    const detailed = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = await this.stat(filePath);
        return {
          name: file,
          path: filePath,
          ...stats
        };
      })
    );
    if (this.eventEmitter_) {
      this.eventEmitter_.emit('filing:listDetailed', { dirPath, files: detailed });
    }
    return detailed;
  }

  async ensureDir(dirPath) {
    const absolutePath = this._resolvePath(dirPath);
    try {
      await fs.ensureDir(absolutePath);
      if (this.eventEmitter_) {
        this.eventEmitter_.emit('filing:ensureDir', { dirPath });
      }
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async rename(sourcePath, destPath) {
    return this.move(sourcePath, destPath);
  }

  async unlink(filePath) {
    return this.delete(filePath);
  }

  // Git-specific methods for managing drafts and commits
  async commit(message = 'Auto-commit from filing provider') {
    return this.publish(message);
  }

  async getDraftFiles() {
    return Array.from(this.draftFiles);
  }

  async discardDrafts() {
    try {
      await this._ensureGitReady();
      
      // Reset to latest remote state
      await this.git.fetch();
      await this.git.reset(['--hard', `origin/${this.options.branch}`]);
      this.draftFiles.clear();
      if (this.eventEmitter_) {
        this.eventEmitter_.emit('filing:discardDrafts');
      }
    } catch (error) {
      throw new Error(`Failed to discard drafts: ${error.message}`);
    }
  }

  // Cleanup method
  async cleanup() {
    this.destroy();
  }

  destroy() {
    if (this.fetchIntervalId) {
      clearInterval(this.fetchIntervalId);
    }
  }
}

module.exports = FilingGitProvider;
