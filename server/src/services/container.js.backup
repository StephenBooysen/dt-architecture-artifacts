/**
 * @fileoverview Simple Dependency Injection Container for managing global services.
 * This approach is the most professional and testable.
 */

class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service factory
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   * @param {boolean} singleton - Whether to treat as singleton
   */
  register(name, factory, singleton = true) {
    this.services.set(name, { factory, singleton });
  }

  /**
   * Get a service instance
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  get(name) {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service '${name}' not registered`);
    }

    if (service.singleton) {
      // Check if singleton already exists
      if (this.singletons.has(name)) {
        return this.singletons.get(name);
      }
      
      // Create singleton instance
      const instance = service.factory();
      this.singletons.set(name, instance);
      return instance;
    }

    // Create new instance each time
    return service.factory();
  }

  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if registered
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Clear all services (mainly for testing)
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered service names
   * @returns {string[]} Array of service names
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }
}

// Export singleton container instance
const container = new ServiceContainer();

module.exports = container;