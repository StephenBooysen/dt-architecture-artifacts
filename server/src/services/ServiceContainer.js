/**
 * @fileoverview Enhanced Dependency Injection Container for managing all services.
 * Consolidates the three different service management patterns into a unified approach.
 * 
 * This container provides:
 * - Service registration and resolution
 * - Singleton lifecycle management
 * - Service initialization with configuration
 * - Event emission for service events
 * - Service status monitoring
 * - Dependency injection capabilities
 */

const EventEmitter = require('events');

/**
 * Enhanced service container that manages all application services
 */
class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.configs = new Map();
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Register a service with its factory and configuration
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   * @param {Object} config - Service configuration
   * @param {boolean} config.singleton - Whether to treat as singleton (default: true)
   * @param {string} config.type - Default service type
   * @param {Object} config.defaultOptions - Default options for service
   * @param {Array<string>} config.dependencies - Service dependencies
   */
  register(name, factory, config = {}) {
    const serviceConfig = {
      factory,
      singleton: config.singleton !== false, // Default to true
      type: config.type || '',
      defaultOptions: config.defaultOptions || {},
      dependencies: config.dependencies || [],
      ...config
    };

    this.services.set(name, serviceConfig);
    this.configs.set(name, serviceConfig);
    
    console.log(`📦 Registered service: ${name}`);
  }

  /**
   * Get a service instance
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  get(name) {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service '${name}' not registered. Available services: ${Array.from(this.services.keys()).join(', ')}`);
    }

    if (service.singleton) {
      // Check if singleton already exists
      if (this.singletons.has(name)) {
        return this.singletons.get(name);
      }
      
      // Resolve dependencies first
      const dependencies = this.resolveDependencies(service.dependencies);
      
      // Create singleton instance
      const instance = this.createInstance(service, dependencies);
      this.singletons.set(name, instance);
      
      // Emit initialization event
      this.eventEmitter.emit('serviceInitialized', { name, instance });
      
      return instance;
    }

    // Create new instance each time (non-singleton)
    const dependencies = this.resolveDependencies(service.dependencies);
    return this.createInstance(service, dependencies);
  }

  /**
   * Initialize a specific service with custom configuration
   * @param {string} name - Service name
   * @param {string} type - Service type
   * @param {Object} options - Service options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Initialized service instance
   */
  initialize(name, type = null, options = {}, eventEmitter = null) {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service '${name}' not registered`);
    }

    // Use provided type or fall back to default
    const serviceType = type !== null ? type : service.type;
    
    // Merge provided options with defaults
    const serviceOptions = { 
      ...service.defaultOptions, 
      ...options,
      'express-app': options['express-app'] // Preserve express app reference
    };

    // Use provided event emitter or container's emitter
    const emitter = eventEmitter || this.eventEmitter;

    try {
      // Resolve dependencies
      const dependencies = this.resolveDependencies(service.dependencies);
      
      // Create instance using factory
      const instance = service.factory(serviceType, serviceOptions, emitter, dependencies);
      
      if (service.singleton) {
        this.singletons.set(name, instance);
      }
      
      // Emit initialization event
      this.eventEmitter.emit('serviceInitialized', { 
        name, 
        type: serviceType, 
        options: serviceOptions,
        instance 
      });
      
      console.log(`✅ ${name} service initialized with type: ${serviceType}`);
      return instance;
      
    } catch (error) {
      console.error(`❌ Failed to initialize ${name} service:`, error.message);
      this.eventEmitter.emit('serviceInitializationFailed', { name, error });
      throw error;
    }
  }

  /**
   * Initialize all registered services
   * @param {Object} commonOptions - Common options for all services
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {Object} Map of service names to instances
   */
  initializeAll(commonOptions = {}, eventEmitter = null) {
    console.log('🔄 Initializing all services...');
    
    const results = {};
    const initOrder = this.getInitializationOrder();
    
    for (const serviceName of initOrder) {
      try {
        const config = this.configs.get(serviceName);
        results[serviceName] = this.initialize(
          serviceName, 
          config.type, 
          { ...commonOptions, ...config.defaultOptions }, 
          eventEmitter
        );
      } catch (error) {
        console.error(`❌ Failed to initialize ${serviceName}:`, error.message);
        results[serviceName] = null;
      }
    }
    
    console.log('✅ Service initialization completed');
    this.eventEmitter.emit('allServicesInitialized', results);
    return results;
  }

  /**
   * Get initialization order based on dependencies
   * @returns {Array<string>} Ordered list of service names
   */
  getInitializationOrder() {
    const services = Array.from(this.services.keys());
    const resolved = new Set();
    const resolving = new Set();
    const result = [];

    const resolve = (serviceName) => {
      if (resolved.has(serviceName)) return;
      if (resolving.has(serviceName)) {
        throw new Error(`Circular dependency detected involving service: ${serviceName}`);
      }

      resolving.add(serviceName);
      const service = this.services.get(serviceName);
      
      if (service && service.dependencies) {
        for (const dep of service.dependencies) {
          resolve(dep);
        }
      }

      resolving.delete(serviceName);
      resolved.add(serviceName);
      result.push(serviceName);
    };

    for (const serviceName of services) {
      resolve(serviceName);
    }

    return result;
  }

  /**
   * Resolve service dependencies
   * @param {Array<string>} dependencies - Array of dependency names
   * @returns {Object} Map of dependency name to instance
   */
  resolveDependencies(dependencies) {
    const resolved = {};
    
    for (const depName of dependencies) {
      resolved[depName] = this.get(depName);
    }
    
    return resolved;
  }

  /**
   * Create a service instance using its factory
   * @param {Object} service - Service configuration
   * @param {Object} dependencies - Resolved dependencies
   * @returns {*} Service instance
   */
  createInstance(service, dependencies) {
    // Call factory with appropriate parameters
    if (service.dependencies.length > 0) {
      return service.factory(service.type, service.defaultOptions, this.eventEmitter, dependencies);
    } else {
      return service.factory(service.type, service.defaultOptions, this.eventEmitter);
    }
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
   * Check if service is initialized (for singletons)
   * @param {string} name - Service name
   * @returns {boolean} True if initialized
   */
  isInitialized(name) {
    return this.singletons.has(name);
  }

  /**
   * Get service status for all registered services
   * @returns {Object} Status information for each service
   */
  getStatus() {
    const status = {};
    
    for (const [name, service] of this.services.entries()) {
      status[name] = {
        registered: true,
        singleton: service.singleton,
        initialized: this.singletons.has(name),
        type: service.type,
        dependencies: service.dependencies,
        hasDependencies: service.dependencies.length > 0
      };
    }
    
    return status;
  }

  /**
   * Get all registered service names
   * @returns {Array<string>} Array of service names
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Reset all services (mainly for testing)
   */
  reset() {
    console.log('🔄 Resetting all services...');
    
    // Reset singletons that have a reset method
    for (const [name, instance] of this.singletons.entries()) {
      try {
        if (instance && typeof instance.reset === 'function') {
          instance.reset();
        }
        console.log(`✅ ${name} service reset`);
      } catch (error) {
        console.error(`❌ Failed to reset ${name} service:`, error.message);
      }
    }
    
    this.singletons.clear();
    this.eventEmitter.emit('allServicesReset');
  }

  /**
   * Reset a specific service
   * @param {string} name - Service name
   */
  resetService(name) {
    if (this.singletons.has(name)) {
      const instance = this.singletons.get(name);
      
      try {
        if (instance && typeof instance.reset === 'function') {
          instance.reset();
        }
        this.singletons.delete(name);
        console.log(`✅ ${name} service reset`);
        this.eventEmitter.emit('serviceReset', { name });
      } catch (error) {
        console.error(`❌ Failed to reset ${name} service:`, error.message);
      }
    }
  }

  /**
   * Clear all services (mainly for testing)
   */
  clear() {
    this.reset();
    this.services.clear();
    this.configs.clear();
    this.eventEmitter.removeAllListeners();
  }

  /**
   * Get the event emitter for service events
   * @returns {EventEmitter} Event emitter instance
   */
  getEventEmitter() {
    return this.eventEmitter;
  }

  /**
   * Convenience method to listen for service events
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   */
  on(event, listener) {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Convenience method to emit service events
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    this.eventEmitter.emit(event, data);
  }
}

// Export singleton container instance
const container = new ServiceContainer();

module.exports = container;