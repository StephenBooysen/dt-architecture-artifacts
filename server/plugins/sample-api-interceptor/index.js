/**
 * @fileoverview Sample API Interceptor Plugin for Architecture Artifacts.
 * 
 * This plugin provides request and response interception capabilities for API calls.
 * It can log requests, add timestamps, filter sensitive data, and modify request/response
 * data as it flows through the server middleware chain.
 * 
 * Methods:
 * - constructor(options): Initializes plugin with configuration options
 * - onRequestIntercept(req, res, next): Intercepts incoming API requests
 * - onResponseIntercept(req, res, data): Intercepts outgoing API responses
 * - filterSensitiveFields(data): Filters sensitive data from objects
 * - getInfo(): Returns plugin information and configuration
 * - create(options): Factory function for creating plugin instance
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 */

const _ = require('lodash');
const moment = require('moment');

/**
 * Sample API Interceptor Plugin class for handling request/response interception.
 * 
 * This class provides comprehensive API interception capabilities including request
 * logging, timestamp tracking, sensitive data filtering, and processing time measurement.
 * It integrates with the Express middleware chain to provide transparent API monitoring.
 */
class SampleApiInterceptorPlugin {
  /**
   * Constructs a new SampleApiInterceptorPlugin instance.
   * 
   * Initializes the plugin with default and custom configuration options
   * including request logging, timestamp addition, and sensitive data filtering.
   * 
   * @param {Object} options - Plugin configuration options
   * @param {boolean} options.logRequests - Whether to log API requests
   * @param {boolean} options.addTimestamp - Whether to add timestamps to requests/responses
   * @param {boolean} options.filterSensitiveData - Whether to filter sensitive fields
   */
  constructor(options = {}) {
    this.options = {
      logRequests: true,
      addTimestamp: true,
      filterSensitiveData: true,
      ...options
    };
    this.name = 'sample-api-interceptor';
    this.version = '1.0.0';
  }

  /**
   * Intercepts incoming API requests for processing and logging.
   * 
   * This method processes incoming requests by adding timestamps, logging request
   * details, and filtering sensitive data from request bodies. It skips processing
   * for authentication endpoints to avoid interference with auth flows.
   * 
   * @param {express.Request} req - Express request object
   * @param {express.Response} res - Express response object
   * @param {express.NextFunction} next - Express next middleware function
   * @returns {void}
   */
  onRequestIntercept(req, res, next) {
    // Skip all processing for authentication endpoints to avoid interference
    const isAuthEndpoint = req.url.includes('/auth/') || req.url.includes('/login') || req.url.includes('/register');
    
    if (isAuthEndpoint) {
      if (this.options.logRequests) {
        console.log(`[${this.name}] Skipping interception for auth endpoint: ${req.method} ${req.url}`);
      }
      return next();
    }

    if (this.options.logRequests) {
      console.log(`[${this.name}] Intercepted request: ${req.method} ${req.url}`);
    }

    if (this.options.addTimestamp) {
      req.pluginData = req.pluginData || {};
      req.pluginData.requestTime = moment().toISOString();
    }

    if (this.options.filterSensitiveData && req.body) {
      req.body = this.filterSensitiveFields(req.body);
    }

    next();
  }

  /**
   * Intercepts outgoing API responses for processing and enhancement.
   * 
   * This method processes outgoing responses by adding metadata including
   * processing timestamps, duration calculations, and logging response details.
   * It enhances response data with timing information when enabled.
   * 
   * @param {express.Request} req - Express request object
   * @param {express.Response} res - Express response object
   * @param {*} data - Response data to be processed
   * @returns {*} Enhanced response data with metadata
   */
  onResponseIntercept(req, res, data) {
    if (this.options.addTimestamp) {
      if (typeof data === 'object' && data !== null) {
        data.metadata = data.metadata || {};
        data.metadata.processedAt = moment().toISOString();
        data.metadata.processingTime = req.pluginData?.requestTime 
          ? moment().diff(moment(req.pluginData.requestTime), 'milliseconds') + 'ms'
          : 'unknown';
      }
    }

    if (this.options.logRequests) {
      console.log(`[${this.name}] Response processed for: ${req.method} ${req.url}`);
    }

    return data;
  }

  /**
   * Filters sensitive fields from data objects to prevent information leakage.
   * 
   * This method recursively scans objects for sensitive field names and replaces
   * their values with a filtered placeholder. It uses lodash for deep cloning
   * and field manipulation to ensure data integrity.
   * 
   * @param {*} data - Data object to filter (can be any type)
   * @returns {*} Filtered data with sensitive fields masked
   */
  filterSensitiveFields(data) {
    const sensitiveFields = ['password', 'secret', 'token', 'key'];
    
    if (typeof data === 'object' && data !== null) {
      const filtered = _.cloneDeep(data);
      
      sensitiveFields.forEach(field => {
        if (_.has(filtered, field)) {
          _.set(filtered, field, '***FILTERED***');
        }
      });
      
      return filtered;
    }
    
    return data;
  }

  /**
   * Returns plugin information and current configuration.
   * 
   * This method provides metadata about the plugin including its name, version,
   * description, and current configuration options. Used for plugin management
   * and debugging purposes.
   * 
   * @returns {Object} Plugin information object
   * @returns {string} returns.name - Plugin name
   * @returns {string} returns.version - Plugin version
   * @returns {string} returns.description - Plugin description
   * @returns {Object} returns.options - Current plugin configuration
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: 'Sample plugin that intercepts API calls and modifies request/response data',
      options: this.options
    };
  }
}

/**
 * Plugin module exports with factory functions and metadata.
 * 
 * This module export provides the plugin interface including name, version,
 * file interceptors, and factory functions for creating plugin instances.
 * It follows the standard plugin architecture for the Architecture Artifacts system.
 */
module.exports = {
  name: 'sample-api-interceptor',
  version: '1.0.0',
  
  files: {
    /**
     * Legacy file interceptor function (deprecated).
     * 
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     * @param {express.NextFunction} next - Express next middleware function
     * @returns {void}
     * @deprecated Use create() factory function instead
     */
    intercept: (req, res, next) => {
      const plugin = new SampleApiInterceptorPlugin();
      return plugin.onRequestIntercept(req, res, next);
    }
  },

  /**
   * Creates a new plugin instance with the specified configuration.
   * 
   * This factory function instantiates a new SampleApiInterceptorPlugin with
   * custom options and returns an object with middleware functions, response
   * handlers, and plugin metadata for use in the server middleware chain.
   * 
   * @param {Object} options - Plugin configuration options
   * @returns {Object} Plugin instance with middleware functions
   * @returns {Function} returns.middleware - Request middleware function
   * @returns {Function} returns.responseHandler - Response handler function
   * @returns {Function} returns.info - Plugin info getter function
   * @returns {Object} returns.config - Plugin configuration object
   */
  create: (options = {}) => {
    const plugin = new SampleApiInterceptorPlugin(options);
    
    return {
      middleware: (req, res, next) => plugin.onRequestIntercept(req, res, next),
      
      responseHandler: (req, res, data) => plugin.onResponseIntercept(req, res, data),
      
      info: () => plugin.getInfo(),
      
      config: plugin.options
    };
  }
};