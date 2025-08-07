/**
 * @fileoverview DataRing service for managing multiple data containers.
 * @fileoverview Factory for creating DataRingService instances.
 */

const DataServeProvider = require('./providers/dataserve');
const DataServeFileProvider = require('./providers/dataservefiles');
const Routes = require('./routes');

/**
 * Creates a DataRingService instance based on the provided type.
 * @param {string} type The type of data serving provider to use. Valid options are 'memory', 'file'.
 * @param {Object=} options The connection options for the chosen provider.
 * @param {EventEmitter} eventEmitter An event emitter for handling events.
 * @return {!DataRingService} A DataRingService instance.
 */
function createDataserveService(type, options, eventEmitter) {
  eventEmitter.emit('Data Service Instantiated', {});
  let provider;
  switch (type) {
    case 'file':
      provider = new DataServeFileProvider(options, eventEmitter);
      break;
    default:
      provider = new DataServeProvider(options, eventEmitter);
      break;
  }
  Routes(options, eventEmitter, provider);
  return provider;
}

module.exports = createDataserveService;