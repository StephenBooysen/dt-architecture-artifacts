/**
 * @fileoverview Centralized service registry for singleton access.
 * This provides a single point of access to all services throughout the application.
 */

const cacheService = require('./caching/singleton');
const dataserveService = require('./dataserve/singleton');
const filingService = require('./filing/singleton');
const loggingService = require('./logging/singleton');
const measuringService = require('./measuring/singleton');
const notifyingService = require('./notifying/singleton');
const queueingService = require('./queueing/singleton');
const schedulingService = require('./scheduling/singleton');
const searchingService = require('./searching/singleton');
const workflowService = require('./workflow/singleton');
const workingService = require('./working/singleton');

/**
 * Service registry for accessing all singleton services
 */
class ServiceRegistry {
  constructor() {
    this.services = {
      cache: cacheService,
      dataserve: dataserveService,
      filing: filingService,
      logging: loggingService,
      measuring: measuringService,
      notifying: notifyingService,
      queueing: queueingService,
      scheduling: schedulingService,
      searching: searchingService,
      workflow: workflowService,
      working: workingService
    };
  }

  /**
   * Get a service by name
   * @param {string} serviceName - Name of the service
   * @returns {*} Service singleton instance
   */
  get(serviceName) {
    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service '${serviceName}' not found. Available services: ${Object.keys(this.services).join(', ')}`);
    }
    return service;
  }

  /**
   * Check if a service is available
   * @param {string} serviceName - Name of the service
   * @returns {boolean} True if service exists
   */
  has(serviceName) {
    return this.services.hasOwnProperty(serviceName);
  }

  /**
   * Get all available service names
   * @returns {string[]} Array of service names
   */
  getServiceNames() {
    return Object.keys(this.services);
  }

  /**
   * Check if all services are initialized
   * @returns {Object} Status of all services
   */
  getStatus() {
    const status = {};
    for (const [name, service] of Object.entries(this.services)) {
      status[name] = {
        initialized: service.isReady(),
        serviceName: service.getServiceName()
      };
    }
    return status;
  }

  /**
   * Initialize all services with common configuration
   * @param {Object} commonOptions - Common options for all services
   * @param {EventEmitter} eventEmitter - Event emitter instance
   */
  initializeAll(commonOptions = {}, eventEmitter = null) {
    console.log('Initializing all services...');
    
    // Initialize services with their default types
    const serviceConfigs = {
      cache: { type: 'memory' },
      dataserve: { type: '' },
      filing: { type: 'local' },
      logging: { type: 'console' },
      measuring: { type: '' },
      notifying: { type: '' },
      queueing: { type: '' },
      scheduling: { type: '' },
      searching: { type: '' },
      workflow: { type: '' },
      working: { type: '' }
    };

    const results = {};
    for (const [name, service] of Object.entries(this.services)) {
      try {
        const config = serviceConfigs[name];
        results[name] = service.initialize(config.type, commonOptions, eventEmitter);
        console.log(`✅ ${name} service initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${name} service:`, error.message);
        results[name] = null;
      }
    }
    
    console.log('Service initialization completed');
    return results;
  }

  /**
   * Reset all services (mainly for testing)
   */
  resetAll() {
    console.log('Resetting all services...');
    for (const [name, service] of Object.entries(this.services)) {
      try {
        service.reset();
        console.log(`✅ ${name} service reset`);
      } catch (error) {
        console.error(`❌ Failed to reset ${name} service:`, error.message);
      }
    }
  }

  // Convenience getters for direct access
  get cache() { return this.services.cache; }
  get dataserve() { return this.services.dataserve; }
  get filing() { return this.services.filing; }
  get logging() { return this.services.logging; }
  get measuring() { return this.services.measuring; }
  get notifying() { return this.services.notifying; }
  get queueing() { return this.services.queueing; }
  get scheduling() { return this.services.scheduling; }
  get searching() { return this.services.searching; }
  get workflow() { return this.services.workflow; }
  get working() { return this.services.working; }
}

// Export singleton instance
const serviceRegistry = new ServiceRegistry();

module.exports = serviceRegistry;