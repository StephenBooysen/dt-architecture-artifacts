/**
 * @fileoverview Base singleton class for all services.
 * Provides common singleton functionality that all services can inherit.
 */

class ServiceSingleton {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.instance = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the service singleton
   * @param {Function} createService - Factory function to create the service
   * @param {*} type - Service type parameter
   * @param {Object} options - Service options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Service instance
   */
  initialize(createService, type = '', options = {}, eventEmitter = null) {
    if (this.isInitialized && this.instance) {
      console.warn(`${this.serviceName} singleton already initialized. Returning existing instance.`);
      return this.instance;
    }

    try {
      this.instance = createService(type, options, eventEmitter);
      this.isInitialized = true;
      
      if (eventEmitter) {
        eventEmitter.emit(`${this.serviceName} Service Singleton Initialized`, { type, options });
      }
      
      console.log(`${this.serviceName} singleton initialized with type: ${type}`);
      return this.instance;
    } catch (error) {
      console.error(`Failed to initialize ${this.serviceName} singleton:`, error);
      throw error;
    }
  }

  /**
   * Get the service instance
   * @returns {*} Service instance
   * @throws {Error} If service is not initialized
   */
  getInstance() {
    if (!this.isInitialized || !this.instance) {
      throw new Error(`${this.serviceName} singleton not initialized. Call initialize() first.`);
    }
    return this.instance;
  }

  /**
   * Check if the service is ready
   * @returns {boolean} True if initialized
   */
  isReady() {
    return this.isInitialized && this.instance !== null;
  }

  /**
   * Reset the singleton (mainly for testing)
   */
  reset() {
    this.instance = null;
    this.isInitialized = false;
    console.log(`${this.serviceName} singleton reset`);
  }

  /**
   * Get service name
   * @returns {string} Service name
   */
  getServiceName() {
    return this.serviceName;
  }
}

module.exports = ServiceSingleton;