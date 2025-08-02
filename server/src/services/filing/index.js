/**
 * @fileoverview Filing service for abstracting file operations and factory for creating FilingService instances.
 */
const LocalFilingProvider = require('./providers/filingLocal');
const FtpFilingProvider = require('./providers/filingFtp');
const S3FilingProvider = require('./providers/filingS3');
const FilingGitProvider = require('./providers/filingGit');

/**
 * Creates a FilingService instance based on the provided type.
 * @param {string} type The type of filing provider to use. Valid options are 'local', 'ftp', 's3', 'azure', and 'git'.
 * @param {Object=} options The connection options for the chosen provider.
 * @return {!FilingService} A FilingService instance.
 */
function createFilingService(type = 'local', options, eventEmitter) {
  eventEmitter.emit('Filing Service Initiatiated', {});
  console.log(options)
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
  return provider;
}

module.exports = createFilingService;
