/**
 * @fileoverview Utility functions for accessing singleton services.
 * This provides convenient helper functions for using services throughout the application.
 */

const serviceRegistry = require('../services/index');

/**
 * Get a service instance by name
 * @param {string} serviceName - Name of the service
 * @returns {*} Service instance
 */
function getService(serviceName) {
  return serviceRegistry.get(serviceName);
}

/**
 * Get the cache service
 * @returns {CacheSingleton} Cache service instance
 */
function getCache() {
  return serviceRegistry.cache;
}

/**
 * Get the logging service
 * @returns {LoggingSingleton} Logging service instance
 */
function getLogger() {
  return serviceRegistry.logging;
}

/**
 * Get the filing service
 * @returns {FilingSingleton} Filing service instance
 */
function getFiling() {
  return serviceRegistry.filing;
}

/**
 * Get the measuring service
 * @returns {MeasuringSingleton} Measuring service instance
 */
function getMeasuring() {
  return serviceRegistry.measuring;
}

/**
 * Get the notifying service
 * @returns {NotifyingSingleton} Notifying service instance
 */
function getNotifying() {
  return serviceRegistry.notifying;
}

/**
 * Get the queueing service
 * @returns {QueueingSingleton} Queueing service instance
 */
function getQueueing() {
  return serviceRegistry.queueing;
}

/**
 * Get the scheduling service
 * @returns {SchedulingSingleton} Scheduling service instance
 */
function getScheduling() {
  return serviceRegistry.scheduling;
}

/**
 * Get the searching service
 * @returns {SearchingSingleton} Searching service instance
 */
function getSearching() {
  return serviceRegistry.searching;
}

/**
 * Get the workflow service
 * @returns {WorkflowSingleton} Workflow service instance
 */
function getWorkflow() {
  return serviceRegistry.workflow;
}

/**
 * Get the working service
 * @returns {WorkingSingleton} Working service instance
 */
function getWorking() {
  return serviceRegistry.working;
}

/**
 * Get the dataserve service
 * @returns {DataserveSingleton} Dataserve service instance
 */
function getDataserve() {
  return serviceRegistry.dataserve;
}

/**
 * Log a message using the logging service
 * @param {string} level - Log level (info, error, warn, debug)
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
function log(level, message, meta = {}) {
  try {
    const logger = getLogger();
    if (logger.isReady()) {
      logger.log(level, message, meta);
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, meta);
    }
  } catch (error) {
    console.log(`[${level.toUpperCase()}] ${message}`, meta);
  }
}

/**
 * Log info message
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
function logInfo(message, meta = {}) {
  log('info', message, meta);
}

/**
 * Log error message
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
function logError(message, meta = {}) {
  log('error', message, meta);
}

/**
 * Log warning message
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
function logWarn(message, meta = {}) {
  log('warn', message, meta);
}

/**
 * Log debug message
 * @param {string} message - Message to log
 * @param {Object} meta - Additional metadata
 */
function logDebug(message, meta = {}) {
  log('debug', message, meta);
}

/**
 * Cache a value
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @returns {Promise<void>}
 */
async function cacheSet(key, value) {
  try {
    const cache = getCache();
    if (cache.isReady()) {
      await cache.put(key, value);
    }
  } catch (error) {
    logError('Failed to set cache value', { key, error: error.message });
  }
}

/**
 * Get a cached value
 * @param {string} key - Cache key
 * @returns {Promise<*>} Cached value or null
 */
async function cacheGet(key) {
  try {
    const cache = getCache();
    if (cache.isReady()) {
      return await cache.get(key);
    }
  } catch (error) {
    logError('Failed to get cache value', { key, error: error.message });
  }
  return null;
}

/**
 * Record a metric
 * @param {string} name - Metric name
 * @param {number} value - Metric value
 * @param {Object} tags - Additional tags
 */
function recordMetric(name, value, tags = {}) {
  try {
    const measuring = getMeasuring();
    if (measuring.isReady()) {
      measuring.measure(name, value, tags);
    }
  } catch (error) {
    logError('Failed to record metric', { name, value, error: error.message });
  }
}

module.exports = {
  // Service getters
  getService,
  getCache,
  getLogger,
  getFiling,
  getMeasuring,
  getNotifying,
  getQueueing,
  getScheduling,
  getSearching,
  getWorkflow,
  getWorking,
  getDataserve,
  
  // Convenience functions
  log,
  logInfo,
  logError,
  logWarn,
  logDebug,
  cacheSet,
  cacheGet,
  recordMetric,
  
  // Direct registry access
  serviceRegistry
};