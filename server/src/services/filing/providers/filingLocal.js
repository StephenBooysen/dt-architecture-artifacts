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
  }

  _resolvePath(filePath) {
    // Handle empty or current directory path
    if (!filePath || filePath === '.' || filePath === '') {
      return this.options.localPath;
    }
    
    // Prevent path traversal attacks
    const resolvedPath = path.join(this.options.localPath, filePath);
    if (!resolvedPath.startsWith(this.options.localPath)) {
        throw new Error('Access denied: Path traversal detected.');
    }
    return resolvedPath;
  }

  async create(filePath, content) {
    const absolutePath = this._resolvePath(filePath);
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
