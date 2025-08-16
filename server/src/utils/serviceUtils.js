/**
 * @fileoverview Service access utility for the unified DI container.
 * Provides convenient access to services throughout the application.
 */

const container = require('../services/ServiceContainer');

/**
 * Get a service instance from the container
 * @param {string} serviceName - Name of the service
 * @returns {*} Service instance
 */
function getService(serviceName) {
  try {
    return container.get(serviceName);
  } catch (error) {
    console.error(`Failed to get service '${serviceName}':`, error.message);
    throw error;
  }
}

/**
 * Check if a service is available and initialized
 * @param {string} serviceName - Name of the service
 * @returns {boolean} True if service is available and initialized
 */
function isServiceReady(serviceName) {
  return container.has(serviceName) && container.isInitialized(serviceName);
}

/**
 * Get multiple services at once
 * @param {Array<string>} serviceNames - Array of service names
 * @returns {Object} Object with service name as key and instance as value
 */
function getServices(serviceNames) {
  const services = {};
  
  for (const serviceName of serviceNames) {
    try {
      services[serviceName] = container.get(serviceName);
    } catch (error) {
      console.error(`Failed to get service '${serviceName}':`, error.message);
      services[serviceName] = null;
    }
  }
  
  return services;
}

/**
 * Get all service instances
 * @returns {Object} Object with all service instances
 */
function getAllServices() {
  const serviceNames = container.getServiceNames();
  return getServices(serviceNames);
}

/**
 * Get service container status
 * @returns {Object} Status of all services
 */
function getServiceStatus() {
  return container.getStatus();
}

/**
 * Listen for service events
 * @param {string} event - Event name
 * @param {Function} listener - Event listener
 */
function onServiceEvent(event, listener) {
  container.on(event, listener);
}

/**
 * Convenience getters for commonly used services
 */
const services = {
  get cache() { return getService('cache'); },
  get logging() { return getService('logging'); },
  get filing() { return getService('filing'); },
  get dataserve() { return getService('dataserve'); },
  get measuring() { return getService('measuring'); },
  get notifying() { return getService('notifying'); },
  get queueing() { return getService('queueing'); },
  get scheduling() { return getService('scheduling'); },
  get searching() { return getService('searching'); },
  get workflow() { return getService('workflow'); },
  get working() { return getService('working'); }
};

module.exports = {
  getService,
  isServiceReady,
  getServices,
  getAllServices,
  getServiceStatus,
  onServiceEvent,
  services,
  container
};