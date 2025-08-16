/**
 * @fileoverview Service registration for the unified DI container.
 * Registers all application services with their configurations and dependencies.
 */

const container = require('./ServiceContainer');

// Import service factories
const createCache = require('./caching/index');
const createDataserve = require('./dataserve/index');
const createFiling = require('./filing/index');
const createLogging = require('./logging/index');
const createMeasuring = require('./measuring/index');
const createNotifying = require('./notifying/index');
const createQueueing = require('./queueing/index');
const createScheduling = require('./scheduling/index');
const createSearching = require('./searching/index');
const createWorkflow = require('./workflow/index');
const createWorking = require('./working/index');

/**
 * Register all application services with the DI container
 */
function registerServices() {
  console.log('📦 Registering all services with DI container...');

  // Register logging service (no dependencies, needed by others)
  container.register('logging', createLogging, {
    type: 'console',
    defaultOptions: {},
    dependencies: []
  });

  // Register cache service (no dependencies)
  container.register('cache', createCache, {
    type: 'memory',
    defaultOptions: {},
    dependencies: []
  });

  // Register filing service (no dependencies)
  container.register('filing', createFiling, {
    type: 'local',
    defaultOptions: {},
    dependencies: []
  });

  // Register dataserve service (depends on filing and cache)
  container.register('dataserve', createDataserve, {
    type: '',
    defaultOptions: {},
    dependencies: ['filing', 'cache']
  });

  // Register measuring service (may depend on logging)
  container.register('measuring', createMeasuring, {
    type: '',
    defaultOptions: {},
    dependencies: ['logging']
  });

  // Register notifying service (may depend on logging)
  container.register('notifying', createNotifying, {
    type: '',
    defaultOptions: {},
    dependencies: ['logging']
  });

  // Register queueing service (may depend on logging)
  container.register('queueing', createQueueing, {
    type: '',
    defaultOptions: {},
    dependencies: ['logging']
  });

  // Register scheduling service (may depend on logging and queueing)
  container.register('scheduling', createScheduling, {
    type: '',
    defaultOptions: {},
    dependencies: ['logging', 'queueing']
  });

  // Register searching service (depends on filing and cache)
  container.register('searching', createSearching, {
    type: '',
    defaultOptions: {},
    dependencies: ['filing', 'cache']
  });

  // Register workflow service (depends on multiple services)
  container.register('workflow', createWorkflow, {
    type: '',
    defaultOptions: {},
    dependencies: ['logging', 'queueing', 'scheduling']
  });

  // Register working service (depends on workflow and other services)
  container.register('working', createWorking, {
    type: '',
    defaultOptions: {},
    dependencies: ['logging', 'workflow', 'queueing']
  });

  console.log('✅ All services registered successfully');
  
  // Log registration summary
  const serviceNames = container.getServiceNames();
  console.log(`📋 Registered ${serviceNames.length} services: ${serviceNames.join(', ')}`);
  
  return container;
}

/**
 * Get service dependency graph for visualization
 * @returns {Object} Dependency graph
 */
function getServiceDependencyGraph() {
  const status = container.getStatus();
  const graph = {};
  
  for (const [serviceName, serviceStatus] of Object.entries(status)) {
    graph[serviceName] = {
      dependencies: serviceStatus.dependencies,
      dependents: []
    };
  }
  
  // Calculate dependents (reverse dependencies)
  for (const [serviceName, serviceInfo] of Object.entries(graph)) {
    for (const dependency of serviceInfo.dependencies) {
      if (graph[dependency]) {
        graph[dependency].dependents.push(serviceName);
      }
    }
  }
  
  return graph;
}

/**
 * Validate service configuration and dependencies
 * @returns {Object} Validation results
 */
function validateServiceConfiguration() {
  const issues = [];
  const warnings = [];
  const status = container.getStatus();
  
  // Check for missing dependencies
  for (const [serviceName, serviceStatus] of Object.entries(status)) {
    for (const dependency of serviceStatus.dependencies) {
      if (!container.has(dependency)) {
        issues.push(`Service '${serviceName}' depends on unregistered service '${dependency}'`);
      }
    }
  }
  
  // Check for circular dependencies (this is handled in getInitializationOrder but let's verify)
  try {
    container.getInitializationOrder();
  } catch (error) {
    if (error.message.includes('Circular dependency')) {
      issues.push(error.message);
    }
  }
  
  // Check for orphaned services (services with no dependents - may be warning only)
  const graph = getServiceDependencyGraph();
  for (const [serviceName, serviceInfo] of Object.entries(graph)) {
    if (serviceInfo.dependents.length === 0 && serviceInfo.dependencies.length === 0) {
      warnings.push(`Service '${serviceName}' has no dependencies and no dependents (may be standalone)`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings,
    totalServices: Object.keys(status).length
  };
}

module.exports = {
  registerServices,
  getServiceDependencyGraph,
  validateServiceConfiguration,
  container
};