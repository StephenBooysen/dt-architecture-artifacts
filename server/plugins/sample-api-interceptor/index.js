const _ = require('lodash');
const moment = require('moment');

class SampleApiInterceptorPlugin {
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

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: 'Sample plugin that intercepts API calls and modifies request/response data',
      options: this.options
    };
  }
}

module.exports = {
  name: 'sample-api-interceptor',
  version: '1.0.0',
  
  files: {
    intercept: (req, res, next) => {
      const plugin = new SampleApiInterceptorPlugin();
      return plugin.onRequestIntercept(req, res, next);
    }
  },

  create: (options = {}) => {
    const plugin = new (options);
    
    return {
      middleware: (req, res, next) => plugin.onRequestIntercept(req, res, next),
      
      responseHandler: (req, res, data) => plugin.onResponseIntercept(req, res, data),
      
      info: () => plugin.getInfo(),
      
      config: plugin.options
    };
  }
};