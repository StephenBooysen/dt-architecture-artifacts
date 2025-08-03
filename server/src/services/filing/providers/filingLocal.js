/**
 * @fileoverview Local file system filing provider.
 */

const fs = require('fs-extra');
const path = require('path');

class LocalFilingProvider {
  constructor(options, eventEmitter) {
    this.options = options || {};
    this.eventEmitter_ = eventEmitter;
    if (!this.options.localPath) {
      this.options.localPath = "../content"; 
    }
    this.currentUser = null; // Will be set per-operation for Personal spaces
    this.spaceName = null;   // Will be set to identify the space type
  }

  // Set user context for operations (called by middleware)
  setUserContext(user, spaceName) {
    this.currentUser = user;
    this.spaceName = spaceName;
  }

  _resolvePath(filePath) {
    // Handle empty or current directory path
    if (!filePath || filePath === '.' || filePath === '') {
      return this._getBasePath();
    }
    
    // Get the appropriate base path (with or without username)
    const basePath = this._getBasePath();
    
    // Prevent path traversal attacks
    const resolvedPath = path.resolve(path.join(basePath, filePath));
    const resolvedBasePath = path.resolve(basePath);
    if (!resolvedPath.startsWith(resolvedBasePath)) {
        throw new Error('Access denied: Path traversal detected.');
    }
    return resolvedPath;
  }

  _getBasePath() {
    // For Personal spaces with a current user, include username in path
    if (this.spaceName === 'Personal' && this.currentUser && this.currentUser.username) {
      return path.join(this.options.localPath, this.currentUser.username);
    }
    
    // For all other spaces (Shared, etc.) or when no user context, use original path
    return this.options.localPath;
  }

  async _ensureUserDirectories() {
    // Only for Personal spaces with user context
    if (this.spaceName === 'Personal' && this.currentUser && this.currentUser.username) {
      const userBasePath = this._getBasePath();
      const markdownPath = path.join(userBasePath, 'markdown');
      const templatesPath = path.join(userBasePath, 'templates');
      
      // Ensure user's base directory and subdirectories exist
      await fs.ensureDir(markdownPath);
      await fs.ensureDir(templatesPath);
      
      // Migrate existing shared files to user directory (one-time migration)
      await this._migrateSharedFilesToUser(markdownPath, templatesPath);
      
      // Create initial welcome file if markdown directory is empty
      try {
        const markdownFiles = await fs.readdir(markdownPath);
        if (markdownFiles.length === 0) {
          const welcomeFile = path.join(markdownPath, 'Welcome.md');
          const welcomeContent = `# Welcome to Your Personal Space

Hello ${this.currentUser.username?.trim()}!

This is your personal workspace where you can:
- Create and organize your markdown documents
- Use templates to standardize your documentation
- Keep your files separate from other users

## Getting Started

1. Create new documents using the web interface
2. Organize your files in folders
3. Use templates to speed up document creation

Your files are stored in: \`${userBasePath}\`

Happy documenting! 📝
`;
          await fs.writeFile(welcomeFile, welcomeContent);
        }
      } catch (error) {
        // Ignore errors when creating welcome file - it's optional
        console.warn(`Could not create welcome file for user ${this.currentUser.username}:`, error.message);
      }
    }
  }

  async _migrateSharedFilesToUser(userMarkdownPath, userTemplatesPath) {
    try {
      // Check if migration has already been done for this user
      const migrationMarker = path.join(this._getBasePath(), '.migration_completed');
      if (await fs.pathExists(migrationMarker)) {
        return; // Migration already completed for this user
      }

      // Original shared paths
      const sharedMarkdownPath = path.join(this.options.localPath, 'markdown');
      const sharedTemplatesPath = path.join(this.options.localPath, 'templates');

      // Copy shared markdown files to user directory
      if (await fs.pathExists(sharedMarkdownPath)) {
        const markdownFiles = await fs.readdir(sharedMarkdownPath, { withFileTypes: true });
        for (const dirent of markdownFiles) {
          const sourcePath = path.join(sharedMarkdownPath, dirent.name);
          const destPath = path.join(userMarkdownPath, dirent.name);
          
          if (dirent.isDirectory()) {
            await fs.copy(sourcePath, destPath);
          } else if (dirent.isFile() && path.extname(dirent.name).toLowerCase() === '.md') {
            await fs.copy(sourcePath, destPath);
          }
        }
      }

      // Copy shared template files to user directory
      if (await fs.pathExists(sharedTemplatesPath)) {
        const templateFiles = await fs.readdir(sharedTemplatesPath, { withFileTypes: true });
        for (const dirent of templateFiles) {
          if (dirent.isFile() && path.extname(dirent.name).toLowerCase() === '.json') {
            const sourcePath = path.join(sharedTemplatesPath, dirent.name);
            const destPath = path.join(userTemplatesPath, dirent.name);
            await fs.copy(sourcePath, destPath);
          }
        }
      }

      // Create migration marker
      await fs.writeFile(migrationMarker, JSON.stringify({
        migratedAt: new Date().toISOString(),
        username: this.currentUser.username,
        note: 'Files migrated from shared Personal space to user-specific directory'
      }, null, 2));

      console.log(`Migration completed for user: ${this.currentUser.username}`);
    } catch (error) {
      console.warn(`Migration failed for user ${this.currentUser.username}:`, error.message);
      // Don't throw - let the user continue even if migration fails
    }
  }

  async create(filePath, content) {
    await this._ensureUserDirectories();
    const absolutePath = this._resolvePath(filePath);
    await fs.ensureDir(path.dirname(absolutePath)); // Ensure parent directory exists
    await fs.writeFile(absolutePath, content);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:create', { filePath, content, isDraft: false });
  }

  async read(filePath,encoding) {
    const absolutePath = this._resolvePath(filePath);
    const content = await fs.readFile(absolutePath, encoding);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:read', { filePath, content, isDraft: false });
    return content;
  }

  async delete(filePath) {
    const absolutePath = this._resolvePath(filePath);
    await fs.remove(absolutePath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:delete', { filePath, isDraft: false });
  }

  async list(dirPath) {
    const absolutePath = this._resolvePath(dirPath);
    const files = await fs.readdir(absolutePath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:list', { dirPath, files });
    return files;
  }

  async update(filePath, content) {
    const absolutePath = this._resolvePath(filePath);
    await fs.writeFile(absolutePath, content);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:update', { filePath, content, isDraft: false });
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
    const exists = await fs.pathExists(absolutePath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:exists', { filePath, exists, isDraft: false });
    return exists;
  }

  async mkdir(dirPath, options = { recursive: true }) {
    const absolutePath = this._resolvePath(dirPath);
    await fs.mkdir(absolutePath, options);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:mkdir', { dirPath, options });
  }

  async copy(sourcePath, destPath) {
    const sourceAbsolutePath = this._resolvePath(sourcePath);
    const destAbsolutePath = this._resolvePath(destPath);
    await fs.copy(sourceAbsolutePath, destAbsolutePath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:copy', { sourcePath, destPath, isDraft: false });
  }

  async move(sourcePath, destPath) {
    const sourceAbsolutePath = this._resolvePath(sourcePath);
    const destAbsolutePath = this._resolvePath(destPath);
    await fs.rename(sourceAbsolutePath, destAbsolutePath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:move', { sourcePath, destPath, isDraft: false });
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
      mode: stats.mode
    };
    const resultWithDraft = { ...result, isDraft: false };
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:stat', { filePath, stats: resultWithDraft });
    return resultWithDraft;
  }

  async readdir(dirPath) {
    return this.listDetailed(dirPath);
  } 

  async listDetailed(dirPath) {
    await this._ensureUserDirectories();
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
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:listDetailed', { dirPath, files: detailed });
    return detailed;
  }

  async ensureDir(dirPath) {
    await this._ensureUserDirectories();
    const absolutePath = this._resolvePath(dirPath);
    await fs.ensureDir(absolutePath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:ensureDir', { dirPath });
  }

  async rename(sourcePath, destPath) {
    return this.move(sourcePath, destPath);
  }

  async unlink(filePath) {
    return this.delete(filePath);
  }

  // Git-specific methods for compatibility (local provider has no drafts)
  async getDraftFiles() {
    // Local provider has no drafts - everything is immediately saved
    return [];
  }

  async publish(message) {
    // Local provider doesn't need publishing - files are immediately saved
    // This method exists for compatibility but does nothing
    return { 
      message: 'Local provider does not require publishing - files are automatically saved',
      success: true 
    };
  }

  async commit(message = 'Auto-commit from filing provider') {
    // Alias for publish for compatibility
    return this.publish(message);
  }

  async discardDrafts() {
    // Local provider has no drafts to discard
    return { 
      message: 'Local provider has no drafts to discard - all files are automatically saved',
      success: true 
    };
  }

  // Cleanup method
  async cleanup() {
    // Local provider doesn't need cleanup
  }

  destroy() {
    // Local provider doesn't need destruction
  }
}

module.exports = LocalFilingProvider;
