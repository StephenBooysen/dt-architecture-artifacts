/**
 * @fileoverview Compatibility layer for the old service registry.
 * Redirects calls to the new unified DI container.
 * 
 * This maintains backward compatibility while all code migrates to the new pattern.
 * 
 * @deprecated Use ServiceContainer or serviceUtils directly instead
 */

const { services, getService, getServiceStatus, container } = require('../utils/serviceUtils');

console.warn('⚠️ DEPRECATED: services/index.js is deprecated. Use serviceUtils or ServiceContainer directly.');

/**
 * Legacy ServiceRegistry class for backward compatibility
 * @deprecated Use ServiceContainer directly
 */
class ServiceRegistry {
  /**
   * Get a service by name
   * @param {string} serviceName - Name of the service
   * @returns {*} Service singleton instance
   * @deprecated Use getService() from serviceUtils instead
   */
  get(serviceName) {
    console.warn(`⚠️ DEPRECATED: serviceRegistry.get('${serviceName}') is deprecated. Use serviceUtils.getService('${serviceName}') instead.`);
    return getService(serviceName);
  }

  /**
   * Check if a service is available
   * @param {string} serviceName - Name of the service
   * @returns {boolean} True if service exists
   * @deprecated Use container.has() instead
   */
  has(serviceName) {
    console.warn(`⚠️ DEPRECATED: serviceRegistry.has('${serviceName}') is deprecated. Use container.has('${serviceName}') instead.`);
    return container.has(serviceName);
  }

  /**
   * Get all available service names
   * @returns {string[]} Array of service names
   * @deprecated Use container.getServiceNames() instead
   */
  getServiceNames() {
    console.warn('⚠️ DEPRECATED: serviceRegistry.getServiceNames() is deprecated. Use container.getServiceNames() instead.');
    return container.getServiceNames();
  }

  /**
   * Check if all services are initialized
   * @returns {Object} Status of all services
   * @deprecated Use getServiceStatus() from serviceUtils instead
   */
  getStatus() {
    console.warn('⚠️ DEPRECATED: serviceRegistry.getStatus() is deprecated. Use serviceUtils.getServiceStatus() instead.');
    return getServiceStatus();
  }

  /**
   * Initialize all services - NO-OP (services are auto-initialized now)
   * @deprecated Services are now auto-initialized by the DI container
   */
  initializeAll() {
    console.warn('⚠️ DEPRECATED: serviceRegistry.initializeAll() is deprecated. Services are auto-initialized by the DI container.');
    return getServiceStatus();
  }

  /**
   * Reset all services
   * @deprecated Use container.reset() instead
   */
  resetAll() {
    console.warn('⚠️ DEPRECATED: serviceRegistry.resetAll() is deprecated. Use container.reset() instead.');
    container.reset();
  }

  // Legacy convenience getters
  get cache() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.cache is deprecated. Use services.cache instead.');
    return services.cache; 
  }
  get dataserve() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.dataserve is deprecated. Use services.dataserve instead.');
    return services.dataserve; 
  }
  get filing() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.filing is deprecated. Use services.filing instead.');
    return services.filing; 
  }
  get logging() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.logging is deprecated. Use services.logging instead.');
    return services.logging; 
  }
  get measuring() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.measuring is deprecated. Use services.measuring instead.');
    return services.measuring; 
  }
  get notifying() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.notifying is deprecated. Use services.notifying instead.');
    return services.notifying; 
  }
  get queueing() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.queueing is deprecated. Use services.queueing instead.');
    return services.queueing; 
  }
  get scheduling() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.scheduling is deprecated. Use services.scheduling instead.');
    return services.scheduling; 
  }
  get searching() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.searching is deprecated. Use services.searching instead.');
    return services.searching; 
  }
  get workflow() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.workflow is deprecated. Use services.workflow instead.');
    return services.workflow; 
  }
  get working() { 
    console.warn('⚠️ DEPRECATED: serviceRegistry.working is deprecated. Use services.working instead.');
    return services.working; 
  }
}

// Export legacy singleton instance for backward compatibility
const serviceRegistry = new ServiceRegistry();

module.exports = serviceRegistry;