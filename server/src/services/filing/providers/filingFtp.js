/**
 * @fileoverview FTP filing provider.
 */

const Client = require('ftp');
const path = require('path');

class FtpFilingProvider {
  constructor(options, eventEmitter) {
    this.connectionString = options.connectionString;
    this.client = new Client();
    this.isConnected = false;
    this.eventEmitter_ = eventEmitter;

    this.client.on('ready', () => {
      this.isConnected = true;
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:ftp:connected', {
          connectionString: this.connectionString,
        });
    });

    this.client.on('end', () => {
      this.isConnected = false;
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:ftp:disconnected', {
          connectionString: this.connectionString,
        });
    });

    this.client.on('error', (err) => {
      console.error('FTP Client Error:', err);
      this.isConnected = false;
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:ftp:error', {
          connectionString: this.connectionString,
          error: err.message,
        });
    });
  }

  async connect() {
    if (this.isConnected) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.client.connect(this.connectionString);
      this.client.once('ready', () => {
        this.isConnected = true;
        resolve();
      });
      this.client.once('error', reject);
    });
  }

  async disconnect() {
    if (this.isConnected) {
      this.client.end();
    }
  }

  async create(filePath, content) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.client.put(Buffer.from(content), filePath, (err) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:create:error', {
              filePath,
              error: err.message,
            });
          return reject(err);
        }
        if (this.eventEmitter_)
          this.eventEmitter_.emit('filing:create', { filePath, content });
        resolve();
      });
    });
  }

  async read(filePath) {
    await this.connect();
    return new Promise((resolve, reject) => {
      let data = '';
      this.client.get(filePath, (err, stream) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:read:error', {
              filePath,
              error: err.message,
            });
          return reject(err);
        }
        stream.on('data', (chunk) => (data += chunk.toString()));
        stream.on('end', () => {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:read', { filePath, content: data });
          resolve(data);
        });
        stream.on('error', (err) => {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:read:error', {
              filePath,
              error: err.message,
            });
          reject(err);
        });
      });
    });
  }

  async delete(filePath) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.client.delete(filePath, (err) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:delete:error', {
              filePath,
              error: err.message,
            });
          return reject(err);
        }
        if (this.eventEmitter_)
          this.eventEmitter_.emit('filing:delete', { filePath });
        resolve();
      });
    });
  }

  async list(dirPath) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.client.list(dirPath, (err, list) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:list:error', {
              dirPath,
              error: err.message,
            });
          return reject(err);
        }
        const files = list.map((item) => item.name);
        if (this.eventEmitter_)
          this.eventEmitter_.emit('filing:list', { dirPath, files });
        resolve(files);
      });
    });
  }

  async update(filePath, content) {
    // For FTP, update is essentially create (put) as it overwrites if exists
    await this.connect();
    return new Promise((resolve, reject) => {
      this.client.put(Buffer.from(content), filePath, (err) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:update:error', {
              filePath,
              error: err.message,
            });
          return reject(err);
        }
        if (this.eventEmitter_)
          this.eventEmitter_.emit('filing:update', { filePath, content });
        resolve();
      });
    });
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
    await this.connect();
    return new Promise((resolve, reject) => {
      this.client.list(path.dirname(filePath), (err, list) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:exists', { filePath, exists: false });
          resolve(false);
          return;
        }
        const fileName = path.basename(filePath);
        const exists = list.some(item => item.name === fileName);
        if (this.eventEmitter_)
          this.eventEmitter_.emit('filing:exists', { filePath, exists });
        resolve(exists);
      });
    });
  }

  async mkdir(dirPath, options = { recursive: true }) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.client.mkdir(dirPath, options.recursive, (err) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:mkdir:error', {
              dirPath,
              error: err.message,
            });
          return reject(err);
        }
        if (this.eventEmitter_)
          this.eventEmitter_.emit('filing:mkdir', { dirPath, options });
        resolve();
      });
    });
  }

  async copy(sourcePath, destPath) {
    // FTP doesn't support direct copy, so read and write
    const content = await this.read(sourcePath);
    await this.create(destPath, content);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:copy', { sourcePath, destPath });
  }

  async move(sourcePath, destPath) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.client.rename(sourcePath, destPath, (err) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:move:error', {
              sourcePath,
              destPath,
              error: err.message,
            });
          return reject(err);
        }
        if (this.eventEmitter_)
          this.eventEmitter_.emit('filing:move', { sourcePath, destPath });
        resolve();
      });
    });
  }

  async stat(filePath) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.client.list(path.dirname(filePath), (err, list) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:stat:error', {
              filePath,
              error: err.message,
            });
          return reject(err);
        }
        const fileName = path.basename(filePath);
        const item = list.find(item => item.name === fileName);
        if (!item) {
          const error = new Error('File not found');
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:stat:error', {
              filePath,
              error: error.message,
            });
          return reject(error);
        }
        const result = {
          size: item.size,
          isFile: item.type === '-',
          isDirectory: item.type === 'd',
          mtime: item.date,
          ctime: item.date,
          atime: item.date,
          mode: parseInt(item.rights, 8)
        };
        if (this.eventEmitter_)
          this.eventEmitter_.emit('filing:stat', { filePath, stats: result });
        resolve(result);
      });
    });
  }

  async readdir(dirPath) {
    return this.listDetailed(dirPath);
  }

  async listDetailed(dirPath) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.client.list(dirPath, (err, list) => {
        if (err) {
          if (this.eventEmitter_)
            this.eventEmitter_.emit('filing:listDetailed:error', {
              dirPath,
              error: err.message,
            });
          return reject(err);
        }
        const detailed = list.map((item) => ({
          name: item.name,
          path: path.join(dirPath, item.name),
          size: item.size,
          isFile: item.type === '-',
          isDirectory: item.type === 'd',
          mtime: item.date,
          ctime: item.date,
          atime: item.date,
          mode: parseInt(item.rights, 8)
        }));
        if (this.eventEmitter_)
          this.eventEmitter_.emit('filing:listDetailed', { dirPath, files: detailed });
        resolve(detailed);
      });
    });
  }

  async ensureDir(dirPath) {
    const exists = await this.exists(dirPath);
    if (!exists) {
      await this.mkdir(dirPath);
    }
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:ensureDir', { dirPath });
  }

  async rename(sourcePath, destPath) {
    return this.move(sourcePath, destPath);
  }

  async unlink(filePath) {
    return this.delete(filePath);
  }
}

module.exports = FtpFilingProvider;
