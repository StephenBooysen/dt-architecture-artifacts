/**
 * @fileoverview API monitoring middleware and functionality.
 * Handles API call logging, statistics, and monitoring dashboard.
 */

/**
 * Create API monitoring middleware and utilities
 */
function createApiMonitoring(maxApiCalls = 1000) {
  /** @type {Array<Object>} Array to store API call logs for monitoring */
  const apiCalls = [];

  /**
   * Middleware to log API calls for monitoring purposes.
   * 
   * This middleware intercepts all API requests and responses to collect
   * performance and usage metrics. It captures request details, response
   * metadata, and timing information.
   * 
   * @param {express.Request} req - Express request object
   * @param {express.Response} res - Express response object  
   * @param {express.NextFunction} next - Express next middleware function
   */
  function logApiCall(req, res, next) {
    const startTime = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override res.end to capture response details
    res.end = function(chunk, encoding) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log the API call
      const apiCall = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('user-agent'),
        ip: req.ip || req.connection.remoteAddress,
        statusCode: res.statusCode,
        duration: duration,
        responseSize: chunk ? Buffer.byteLength(chunk) : 0,
        requestBody: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : null
      };
      
      // Add to beginning of array and trim if needed
      apiCalls.unshift(apiCall);
      if (apiCalls.length > maxApiCalls) {
        apiCalls.pop();
      }
      
      // Keep app.locals in sync
      req.app.locals.apiCalls = apiCalls;
      
      // Call original end function
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  }

  /**
   * Get API calls data
   */
  function getApiCalls() {
    return apiCalls;
  }

  /**
   * Get API statistics
   */
  function getApiStatistics() {
    const totalCalls = apiCalls.length;
    const successCalls = apiCalls.filter(c => c.statusCode >= 200 && c.statusCode < 300).length;
    const errorCalls = apiCalls.filter(c => c.statusCode >= 400).length;
    const avgDuration = apiCalls.length > 0 
      ? Math.round(apiCalls.reduce((sum, c) => sum + c.duration, 0) / apiCalls.length) 
      : 0;

    return {
      totalCalls,
      successCalls,
      errorCalls,
      avgDuration,
      recentCalls: apiCalls.slice(0, 10)
    };
  }

  /**
   * Clear API monitoring data
   */
  function clearApiCalls() {
    apiCalls.length = 0;
  }

  return {
    logApiCall,
    getApiCalls,
    getApiStatistics,
    clearApiCalls,
    apiCalls // Direct access for app.locals
  };
}

module.exports = {
  createApiMonitoring
};