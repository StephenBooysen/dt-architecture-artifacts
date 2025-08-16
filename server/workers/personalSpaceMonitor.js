/**
 * @fileoverview Personal Space Monitoring Orchestrator
 * Sets up and manages all personal space monitoring workers
 */

const path = require('path');
const axios = require('axios');

// Get service instances
const getSchedulingService = require('../src/services/scheduling/index.js');
const getQueueService = require('../src/services/queueing/index.js');
const getCacheService = require('../src/services/caching/index.js');
const getSearchService = require('../src/services/searching/index.js');
const EventEmitter = require('events');

// Worker script paths
const WORKER_SCRIPTS = {
  fileWatcher: path.join(__dirname, 'personalSpaceWatcher.js'),
  cacheProcessor: path.join(__dirname, 'cacheProcessor.js'),
  contentProcessor: path.join(__dirname, 'contentProcessor.js'),
  searchProcessor: path.join(__dirname, 'searchProcessor.js')
};

// Configuration
const MONITORING_CONFIG = {
  fileWatcher: {
    taskName: 'personal-space-watcher',
    intervalSeconds: 0, // Run once and keep alive
    description: 'File system watcher for personal space'
  },
  cacheProcessor: {
    taskName: 'cache-processor',
    intervalSeconds: 0, // Run once and keep alive
    description: 'Cache update processor'
  },
  contentProcessor: {
    taskName: 'content-processor',
    intervalSeconds: 0, // Run once and keep alive
    description: 'Content processing worker'
  },
  searchProcessor: {
    taskName: 'search-processor',
    intervalSeconds: 0, // Run once and keep alive
    description: 'Search index processor'
  }
};

/**
 * Initialize required services
 */
async function initializeServices() {
  const eventEmitter = new EventEmitter();
  
  // Initialize all required services for this process
  console.log('Initializing personal space monitoring services...');
  
  const scheduler = getSchedulingService('memory', {}, eventEmitter);
  const queue = getQueueService('memory', {}, eventEmitter);
  const cache = getCacheService('memory', {}, eventEmitter);
  const search = getSearchService('memory', {}, eventEmitter);
  
  console.log('Services initialized successfully');
  
  return {
    scheduler,
    queue,
    cache,
    search,
    eventEmitter
  };
}

/**
 * Start monitoring workers via scheduler
 */
async function startMonitoringWorkers(services) {
  const { scheduler, eventEmitter } = services;
  
  console.log('Starting personal space monitoring workers...');
  
  // Define execution callback for monitoring worker status
  const executionCallback = (taskName) => (status, data) => {
    if (status === 'completed') {
      console.log(`Worker ${taskName} completed successfully`);
    } else if (status === 'error') {
      console.error(`Worker ${taskName} encountered an error:`, data);
      
      // For critical workers, attempt restart after delay
      if (['personal-space-watcher'].includes(taskName)) {
        console.log(`Scheduling restart for critical worker: ${taskName}`);
        setTimeout(() => {
          restartWorker(scheduler, taskName);
        }, 5000);
      }
    }
  };
  
  // Start each worker
  for (const [workerType, config] of Object.entries(MONITORING_CONFIG)) {
    const scriptPath = WORKER_SCRIPTS[workerType];
    
    if (!scriptPath) {
      console.error(`No script path defined for worker: ${workerType}`);
      continue;
    }
    
    console.log(`Starting ${config.description}...`);
    
    try {
      if (config.intervalSeconds === 0) {
        // For long-running workers, start once and keep alive
        await scheduler.start(
          config.taskName,
          scriptPath,
          86400, // 24 hours interval (effectively run once)
          executionCallback(config.taskName)
        );
      } else {
        // For periodic workers, set proper interval
        await scheduler.start(
          config.taskName,
          scriptPath,
          config.intervalSeconds,
          executionCallback(config.taskName)
        );
      }
      
      console.log(`✓ Started ${config.taskName}`);
    } catch (error) {
      console.error(`✗ Failed to start ${config.taskName}:`, error.message);
    }
  }
  
  // Setup event listeners for monitoring
  setupMonitoringEvents(eventEmitter);
  
  // Register schedules with main server for visibility on services/scheduling page
  await registerSchedulesWithMainServer();
  
  console.log('Personal space monitoring workers started successfully');
}

/**
 * Restart a specific worker
 */
async function restartWorker(scheduler, taskName) {
  try {
    console.log(`Restarting worker: ${taskName}`);
    
    // Stop the existing task
    await scheduler.stop(taskName);
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find the worker config
    const workerConfig = Object.entries(MONITORING_CONFIG).find(
      ([, config]) => config.taskName === taskName
    );
    
    if (workerConfig) {
      const [workerType, config] = workerConfig;
      const scriptPath = WORKER_SCRIPTS[workerType];
      
      await scheduler.start(
        config.taskName,
        scriptPath,
        config.intervalSeconds || 86400,
        (status, data) => {
          console.log(`Restarted worker ${taskName} status: ${status}`);
        }
      );
      
      console.log(`✓ Successfully restarted ${taskName}`);
    }
  } catch (error) {
    console.error(`✗ Failed to restart ${taskName}:`, error.message);
  }
}

/**
 * Register schedules with main server so they appear on services/scheduling page
 */
async function registerSchedulesWithMainServer() {
  console.log('Registering personal space monitoring schedules with main server...');
  
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  
  for (const [workerType, config] of Object.entries(MONITORING_CONFIG)) {
    try {
      // Register each worker as a scheduled task with the main server
      // The scheduling API expects 'task' and 'cron' fields
      const scheduleData = {
        task: config.taskName,
        cron: config.intervalSeconds === 0 ? '0 0 * * *' : `*/${config.intervalSeconds} * * * * *` // Daily for long-running, or interval for periodic
      };
      
      const response = await axios.post(`${serverUrl}/api/scheduling/schedule`, scheduleData);
      console.log(`✓ Registered ${config.taskName} with main scheduler`);
    } catch (error) {
      // Don't fail if we can't register with main server - just log the error
      console.warn(`⚠ Could not register ${config.taskName} with main server:`, error.message);
    }
  }
  
  console.log('Schedule registration with main server completed');
}

/**
 * Setup monitoring events
 */
function setupMonitoringEvents(eventEmitter) {
  // Log important events
  eventEmitter.on('worker:start', (data) => {
    console.log(`Worker started: ${data.scriptPath}`);
  });
  
  eventEmitter.on('worker:error', (data) => {
    console.error(`Worker error: ${data.error}`);
  });
  
  eventEmitter.on('worker:stop', () => {
    console.log('Worker stopped');
  });
  
  // Queue monitoring
  eventEmitter.on('queue:enqueue', (data) => {
    // Optional: Log queue operations for debugging
    // console.log(`Queued item:`, data.item);
  });
  
  // Cache monitoring
  eventEmitter.on('cache:put', (data) => {
    // Optional: Log cache operations for debugging
    // console.log(`Cached: ${data.key}`);
  });
  
  // Search monitoring  
  eventEmitter.on('search:add', (data) => {
    // Optional: Log search indexing for debugging
    // console.log(`Indexed for search: ${JSON.stringify(data.jsonObject).substring(0, 100)}...`);
  });
}

/**
 * Graceful shutdown
 */
async function shutdown(services) {
  console.log('Shutting down personal space monitoring...');
  
  const { scheduler } = services;
  
  try {
    // Stop all scheduled tasks
    for (const config of Object.values(MONITORING_CONFIG)) {
      await scheduler.stop(config.taskName);
      console.log(`Stopped ${config.taskName}`);
    }
    
    // Unregister schedules from main server
    await unregisterSchedulesFromMainServer();
    
    console.log('Personal space monitoring shutdown complete');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
}

/**
 * Unregister schedules from main server
 */
async function unregisterSchedulesFromMainServer() {
  console.log('Unregistering personal space monitoring schedules from main server...');
  
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  
  for (const config of Object.values(MONITORING_CONFIG)) {
    try {
      await axios.delete(`${serverUrl}/api/scheduling/cancel/${config.taskName}`);
      console.log(`✓ Unregistered ${config.taskName} from main scheduler`);
    } catch (error) {
      // Don't fail shutdown if we can't unregister - just log the warning
      console.warn(`⚠ Could not unregister ${config.taskName} from main server:`, error.message);
    }
  }
  
  console.log('Schedule unregistration from main server completed');
}

/**
 * Health check for monitoring system
 */
async function healthCheck() {
  try {
    // Check if required services are responding
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const checks = [
      { service: 'Queue', url: `${serverUrl}/api/queueing/status` },
      { service: 'Cache', url: `${serverUrl}/api/caching/status` },
      { service: 'Search', url: `${serverUrl}/api/searching/status` }
    ];
    
    const results = await Promise.all(
      checks.map(async (check) => {
        try {
          const response = await axios.get(check.url);
          return {
            service: check.service,
            healthy: response.status === 200,
            status: response.status
          };
        } catch (error) {
          return {
            service: check.service,
            healthy: false,
            error: error.message
          };
        }
      })
    );
    
    const allHealthy = results.every(r => r.healthy);
    console.log('Health check results:', results);
    
    return allHealthy;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

/**
 * Main orchestrator function
 */
async function run() {
  try {
    console.log('Starting Personal Space Monitoring Orchestrator...');
    
    // Initialize services
    const services = await initializeServices();
    
    // Wait for services to be ready
    let retries = 15;
    while (retries > 0 && !(await healthCheck())) {
      console.log(`Waiting for services to be ready... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      retries--;
    }
    
    if (retries === 0) {
      throw new Error('Services not ready after waiting. Check service configuration.');
    }
    
    // Start monitoring workers
    await startMonitoringWorkers(services);
    
    // Setup graceful shutdown
    process.on('SIGINT', () => shutdown(services));
    process.on('SIGTERM', () => shutdown(services));
    
    console.log('🚀 Personal Space Monitoring System is running!');
    console.log('Monitoring:');
    console.log('  - File system changes in personal spaces');
    console.log('  - Cache updates for fast API responses');
    console.log('  - Content processing and indexing');
    console.log('  - Search service updates');
    
    // Keep the process alive
    return new Promise((resolve) => {
      process.on('SIGTERM', resolve);
      process.on('SIGINT', resolve);
    });
    
  } catch (error) {
    console.error('Failed to start Personal Space Monitoring:', error);
    throw error;
  }
}

// Support both direct execution and worker thread
if (require.main === module) {
  run().catch((error) => {
    console.error('Personal Space Monitoring failed:', error);
    process.exit(1);
  });
} else {
  module.exports = { run };
}