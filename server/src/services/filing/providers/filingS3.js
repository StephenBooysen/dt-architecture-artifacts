/**
 * @fileoverview AWS S3 filing provider.
 */

const AWS = require('@aws-sdk/client-s3');
const path = require('path');

class S3FilingProvider {
  /**
   * Initializes the S3 client.
   * @param {Object} options The options for the S3 client.
   * @param {string} options.bucketName The name of the S3 bucket.
   * @param {string} options.region The AWS region.
   * @param {string} [options.accessKeyId] The AWS access key ID. (Optional, will use environment variables if not provided)
   * @param {string} [options.secretAccessKey] The AWS secret access key. (Optional, will use environment variables if not provided)
   */
  constructor(options, eventEmitter) {
    if (!options || !options.bucketName || !options.region) {
      throw new Error(
        'S3FilingProvider requires bucketName and region in options.',
      );
    }

    this.bucketName = options.bucketName;
    AWS.config.update({
      region: options.region,
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    });
    this.s3 = new AWS.S3();
    this.eventEmitter_ = eventEmitter;
  }

  /**
   * Uploads a file to S3.
   * @param {string} filePath - The path to the file in the bucket (key).
   * @param {string} content - The content of the file.
   * @returns {Promise<void>}
   */
  async create(filePath, content) {
    const params = {
      Bucket: this.bucketName,
      Key: filePath,
      Body: content,
    };
    try {
      await this.s3.upload(params).promise();
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:create', { filePath, content });
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:create:error', {
          filePath,
          error: error.message,
        });
      throw error;
    }
  }

  /**
   * Downloads a file from S3.
   * @param {string} filePath - The path to the file in the bucket (key).
   * @returns {Promise<string>}
   */
  async read(filePath) {
    const params = {
      Bucket: this.bucketName,
      Key: filePath,
    };
    try {
      const data = await this.s3.getObject(params).promise();
      const content = data.Body.toString('utf-8');
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:read', { filePath, content });
      return content;
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:read:error', {
          filePath,
          error: error.message,
        });
      throw error;
    }
  }

  /**
   * Deletes a file from S3.
   * @param {string} filePath - The path to the file in the bucket (key).
   * @returns {Promise<void>}
   */
  async delete(filePath) {
    const params = {
      Bucket: this.bucketName,
      Key: filePath,
    };
    try {
      await this.s3.deleteObject(params).promise();
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:delete', { filePath });
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:delete:error', {
          filePath,
          error: error.message,
        });
      throw error;
    }
  }

  /**
   * Lists files in a specified "directory" (prefix) in S3.
   * @param {string} dirPath - The prefix to list objects under.
   * @returns {Promise<Array<string>>}
   */
  async list(dirPath) {
    const params = {
      Bucket: this.bucketName,
      Prefix: dirPath,
    };
    try {
      const data = await this.s3.listObjectsV2(params).promise();
      const files = data.Contents ? data.Contents.map((item) => item.Key) : [];
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:list', { dirPath, files });
      return files;
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:list:error', {
          dirPath,
          error: error.message,
        });
      throw error;
    }
  }

  /**
   * Updates a file in S3 (same as create, as S3 overwrites).
   * @param {string} filePath - The path to the file in the bucket (key).
   * @param {string} content - The new content of the file.
   * @returns {Promise<void>}
   */
  async update(filePath, content) {
    // For S3, update is essentially create (put) as it overwrites if exists
    const params = {
      Bucket: this.bucketName,
      Key: filePath,
      Body: content,
    };
    try {
      await this.s3.upload(params).promise();
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:update', { filePath, content });
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:update:error', {
          filePath,
          error: error.message,
        });
      throw error;
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
    try {
      const params = {
        Bucket: this.bucketName,
        Key: filePath,
      };
      await this.s3.headObject(params).promise();
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
    // S3 doesn't have directories, but we can create a placeholder object
    const params = {
      Bucket: this.bucketName,
      Key: dirPath.endsWith('/') ? dirPath : dirPath + '/',
      Body: '',
    };
    try {
      await this.s3.upload(params).promise();
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:mkdir', { dirPath, options });
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:mkdir:error', {
          dirPath,
          error: error.message,
        });
      throw error;
    }
  }

  async copy(sourcePath, destPath) {
    const params = {
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourcePath}`,
      Key: destPath,
    };
    try {
      await this.s3.copyObject(params).promise();
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:copy', { sourcePath, destPath });
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:copy:error', {
          sourcePath,
          destPath,
          error: error.message,
        });
      throw error;
    }
  }

  async move(sourcePath, destPath) {
    await this.copy(sourcePath, destPath);
    await this.delete(sourcePath);
    if (this.eventEmitter_)
      this.eventEmitter_.emit('filing:move', { sourcePath, destPath });
  }

  async stat(filePath) {
    const params = {
      Bucket: this.bucketName,
      Key: filePath,
    };
    try {
      const data = await this.s3.headObject(params).promise();
      const result = {
        size: data.ContentLength,
        isFile: () => true,
        isDirectory: () => false,
        mtime: data.LastModified,
        ctime: data.LastModified,
        atime: data.LastModified,
        mode: 0o644
      };
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:stat', { filePath, stats: result });
      return result;
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:stat:error', {
          filePath,
          error: error.message,
        });
      throw error;
    }
  }

  async readdir(dirPath) {
    return this.listDetailed(dirPath);
  }

  async listDetailed(dirPath) {
    const params = {
      Bucket: this.bucketName,
      Prefix: dirPath,
    };
    try {
      const data = await this.s3.listObjectsV2(params).promise();
      const detailed = data.Contents ? data.Contents.map((item) => ({
        name: path.basename(item.Key),
        path: item.Key,
        size: item.Size,
        isFile: true,
        isDirectory: false,
        mtime: item.LastModified,
        ctime: item.LastModified,
        atime: item.LastModified,
        mode: 0o644
      })) : [];
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:listDetailed', { dirPath, files: detailed });
      return detailed;
    } catch (error) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('filing:listDetailed:error', {
          dirPath,
          error: error.message,
        });
      throw error;
    }
  }

  async ensureDir(dirPath) {
    return this.mkdir(dirPath);
  }

  async rename(sourcePath, destPath) {
    return this.move(sourcePath, destPath);
  }

  async unlink(filePath) {
    return this.delete(filePath);
  }
}

module.exports = S3FilingProvider;
