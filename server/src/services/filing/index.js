/**
 * @fileoverview Filing service for abstracting file operations and factory for creating FilingService instances.
 */

const LocalFilingProvider = require('./providers/filingLocal');
const FtpFilingProvider = require('./providers/filingFtp');
const S3FilingProvider = require('./providers/filingS3');
const FilingGitProvider = require('./providers/filingGit');

class FilingService {
  constructor(provider, eventEmitter) {
    if (!provider) {
      throw new Error('FilingService requires a provider.');
    }
    this.provider = provider;
    this.eventEmitter_ = eventEmitter;
  }

  /**
   * Creates a file with the given content.
   * @param {string} path - The path to the file.
   * @param {string} content - The content of the file.
   * @returns {Promise<void>} A promise that resolves when the file is created.
   */
  async create(path, content) {
    return this.provider.create(path, content);
  }

  /**
   * Reads the content of a file.
   * @param {string} path - The path to the file.
   * @returns {Promise<string>} A promise that resolves with the file content.
   */
  async read(path) {
    return this.provider.read(path);
  }

  /**
   * Deletes a file.
   * @param {string} path - The path to the file.
   * @returns {Promise<void>} A promise that resolves when the file is deleted.
   */
  async delete(path) {
    return this.provider.delete(path);
  }

  /**
   * Lists the contents of a directory.
   * @param {string} path - The path to the directory.
   * @returns {Promise<Array<string>>} A promise that resolves with an array of file/directory names.
   */
  async list(path) {
    return this.provider.list(path);
  }

  /**
   * Updates a file with the given content.
   * @param {string} path - The path to the file.
   * @param {string} content - The new content of the file.
   * @returns {Promise<void>} A promise that resolves when the file is updated.
   */
  async update(path, content) {
    return this.provider.update(path, content);
  }

  /**
   * Uploads a file (alias for create).
   * @param {string} path - The path to the file.
   * @param {string} content - The content of the file.
   * @returns {Promise<void>} A promise that resolves when the file is uploaded.
   */
  async upload(path, content) {
    return this.provider.upload ? this.provider.upload(path, content) : this.provider.create(path, content);
  }

  /**
   * Downloads a file (alias for read).
   * @param {string} path - The path to the file.
   * @returns {Promise<string>} A promise that resolves with the file content.
   */
  async download(path) {
    return this.provider.download ? this.provider.download(path) : this.provider.read(path);
  }

  /**
   * Removes a file (alias for delete).
   * @param {string} path - The path to the file.
   * @returns {Promise<void>} A promise that resolves when the file is removed.
   */
  async remove(path) {
    return this.provider.remove ? this.provider.remove(path) : this.provider.delete(path);
  }

  /**
   * Checks if a file or directory exists.
   * @param {string} path - The path to check.
   * @returns {Promise<boolean>} A promise that resolves with true if the path exists.
   */
  async exists(path) {
    if (this.provider.exists) {
      return this.provider.exists(path);
    }
    try {
      await this.provider.read(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates a directory.
   * @param {string} path - The path to the directory.
   * @param {Object} options - Options for directory creation.
   * @returns {Promise<void>} A promise that resolves when the directory is created.
   */
  async mkdir(path, options = { recursive: true }) {
    if (this.provider.mkdir) {
      return this.provider.mkdir(path, options);
    }
    throw new Error('mkdir operation not supported by this provider');
  }

  /**
   * Copies a file.
   * @param {string} sourcePath - The source file path.
   * @param {string} destPath - The destination file path.
   * @returns {Promise<void>} A promise that resolves when the file is copied.
   */
  async copy(sourcePath, destPath) {
    if (this.provider.copy) {
      return this.provider.copy(sourcePath, destPath);
    }
    const content = await this.read(sourcePath);
    return this.create(destPath, content);
  }

  /**
   * Moves a file.
   * @param {string} sourcePath - The source file path.
   * @param {string} destPath - The destination file path.
   * @returns {Promise<void>} A promise that resolves when the file is moved.
   */
  async move(sourcePath, destPath) {
    if (this.provider.move) {
      return this.provider.move(sourcePath, destPath);
    }
    await this.copy(sourcePath, destPath);
    return this.delete(sourcePath);
  }

  /**
   * Gets file statistics.
   * @param {string} path - The path to the file.
   * @returns {Promise<Object>} A promise that resolves with file stats.
   */
  async stat(path) {
    if (this.provider.stat) {
      return this.provider.stat(path);
    }
    throw new Error('stat operation not supported by this provider');
  }

  /**
   * Lists directory contents with detailed information.
   * @param {string} path - The path to the directory.
   * @returns {Promise<Array<Object>>} A promise that resolves with detailed file information.
   */
  async listDetailed(path) {
    if (this.provider.listDetailed) {
      return this.provider.listDetailed(path);
    }
    const files = await this.list(path);
    return files.map(name => ({ name }));
  }

  /**
   * Ensures a directory exists, creating it if necessary.
   * @param {string} path - The path to the directory.
   * @returns {Promise<void>} A promise that resolves when the directory exists.
   */
  async ensureDir(path) {
    if (this.provider.ensureDir) {
      return this.provider.ensureDir(path);
    }
    if (this.provider.mkdir) {
      try {
        return await this.provider.mkdir(path, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
    throw new Error('ensureDir operation not supported by this provider');
  }
}

/**
 * Creates a FilingService instance based on the provided type.
 * @param {string} type The type of filing provider to use. Valid options are 'local', 'ftp', 's3', 'azure', and 'git'.
 * @param {Object=} options The connection options for the chosen provider.
 * @return {!FilingService} A FilingService instance.
 */
function createFilingService(type = 'local', options, eventEmitter) {
   eventEmitter.emit('Filing Service Intantiated', {});
  let provider;
  switch (type) {
    case 'local':
      provider = new LocalFilingProvider(options, eventEmitter);
      break;
    case 'ftp':
      provider = new FtpFilingProvider(options, eventEmitter);
      break;
    case 's3':
      provider = new S3FilingProvider(options, eventEmitter);
      break;
    case 'git':
        provider = new FilingGitProvider(options, eventEmitter);
        break;
    default:
      provider = new LocalFilingProvider(options, eventEmitter);
  }
  return new FilingService(provider, eventEmitter);
}

module.exports = createFilingService;
