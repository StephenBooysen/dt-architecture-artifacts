/**
 * @fileoverview Local file system filing provider.
 */

const fs = require('fs').promises;
const path = require('path');

class LocalFilingProvider {
  constructor(options, eventEmitter) {
    this.eventEmitter_ = eventEmitter;
  }

  async create(filePath, content) {
    await fs.writeFile(filePath, content);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:create', { filePath, content });
  }

  async read(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:read', { filePath, content });
    return content;
  }

  async delete(filePath) {
    await fs.unlink(filePath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:delete', { filePath });
  }

  async list(dirPath) {
    const files = await fs.readdir(dirPath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:list', { dirPath, files });
    return files;
  }

  async update(filePath, content) {
    await fs.writeFile(filePath, content);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:update', { filePath, content });
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
    try {
      await fs.access(filePath);
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:exists', { filePath, exists: true });
      return true;
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:exists', { filePath, exists: false });
      return false;
    }
  }

  async mkdir(dirPath, options = { recursive: true }) {
    await fs.mkdir(dirPath, options);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:mkdir', { dirPath, options });
  }

  async copy(sourcePath, destPath) {
    await fs.copyFile(sourcePath, destPath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:copy', { sourcePath, destPath });
  }

  async move(sourcePath, destPath) {
    await fs.rename(sourcePath, destPath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:move', { sourcePath, destPath });
  }

  async stat(filePath) {
    const stats = await fs.stat(filePath);
    const result = {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mtime: stats.mtime,
      ctime: stats.ctime,
      atime: stats.atime,
      mode: stats.mode
    };
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:stat', { filePath, stats: result });
    return result;
  }

  async listDetailed(dirPath) {
    const files = await fs.readdir(dirPath);
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
    try {
      await fs.mkdir(dirPath, { recursive: true });
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:ensureDir', { dirPath });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

module.exports = LocalFilingProvider;
