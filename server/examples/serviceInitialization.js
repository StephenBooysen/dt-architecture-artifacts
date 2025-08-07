/**
 * @fileoverview Complete example of service initialization and usage.
 * This demonstrates how to properly set up and use singleton services in your application.
 */

const express = require('express');
const { EventEmitter } = require('events');
const serviceRegistry = require('../src/services/index');
const { logInfo, logError, getLogger } = require('../src/utils/services');

/**
 * Initialize all services with proper configuration
 * @param {Express} app - Express application instance
 * @param {EventEmitter} eventEmitter - Event emitter for service communication
 * @returns {Promise<Object>} Service initialization results
 */
async function initializeServices(app, eventEmitter) {
  console.log('🚀 Initializing Architecture Artifacts Services...');
  
  const commonOptions = {
    'express-app': app,
    // Add any common configuration here
  };

  try {
    // Initialize services individually with specific configurations
    const results = {};

    // 1. Initialize Logging first (needed by other services)
    console.log('📝 Initializing Logging Service...');
    const loggingService = serviceRegistry.get('logging');
    results.logging = loggingService.initialize('console', {
      ...commonOptions,
      level: process.env.LOG_LEVEL || 'info',
      format: 'json'
    }, eventEmitter);

    // 2. Initialize Cache
    console.log('🗄️  Initializing Cache Service...');
    const cacheService = serviceRegistry.get('cache');
    results.cache = cacheService.initialize(
      process.env.CACHE_TYPE || 'memory', 
      {
        ...commonOptions,
        // Redis configuration if using Redis
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      }, 
      eventEmitter
    );

    // 3. Initialize Filing
    console.log('📁 Initializing Filing Service...');
    const filingService = serviceRegistry.get('filing');
    results.filing = filingService.initialize(
      process.env.FILING_TYPE || 'local',
      {
        ...commonOptions,
        basePath: process.env.FILES_BASE_PATH || './content',
        // S3 configuration if using S3
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucket: process.env.S3_BUCKET,
        region: process.env.AWS_REGION || 'us-east-1'
      },
      eventEmitter
    );

    // 4. Initialize Measuring/Metrics
    console.log('📊 Initializing Measuring Service...');
    const measuringService = serviceRegistry.get('measuring');
    results.measuring = measuringService.initialize('', {
      ...commonOptions,
      // Metrics configuration
      prefix: process.env.METRICS_PREFIX || 'dt_architecture',
      tags: {
        service: 'dt-architecture-artifacts',
        environment: process.env.NODE_ENV || 'development'
      }
    }, eventEmitter);

    // 5. Initialize Notifying
    console.log('📢 Initializing Notifying Service...');
    const notifyingService = serviceRegistry.get('notifying');
    results.notifying = notifyingService.initialize('', {
      ...commonOptions,
      // Email configuration
      emailProvider: process.env.EMAIL_PROVIDER || 'console',
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT || 587,
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      // Webhook configuration
      webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL
    }, eventEmitter);

    // 6. Initialize Queueing
    console.log('🚶 Initializing Queueing Service...');
    const queueingService = serviceRegistry.get('queueing');
    results.queueing = queueingService.initialize('', {
      ...commonOptions,
      // Queue configuration
      provider: process.env.QUEUE_PROVIDER || 'memory',
      redisUrl: process.env.REDIS_URL
    }, eventEmitter);

    // 7. Initialize Scheduling
    console.log('⏰ Initializing Scheduling Service...');
    const schedulingService = serviceRegistry.get('scheduling');
    results.scheduling = schedulingService.initialize('', {
      ...commonOptions,
      // Scheduler configuration
      timezone: process.env.TZ || 'UTC',
      maxConcurrency: parseInt(process.env.SCHEDULER_MAX_CONCURRENCY) || 5
    }, eventEmitter);

    // 8. Initialize Searching
    console.log('🔍 Initializing Searching Service...');
    const searchingService = serviceRegistry.get('searching');
    results.searching = searchingService.initialize('', {
      ...commonOptions,
      // Search configuration
      provider: process.env.SEARCH_PROVIDER || 'memory',
      elasticsearchUrl: process.env.ELASTICSEARCH_URL,
      indexName: process.env.SEARCH_INDEX || 'dt_architecture'
    }, eventEmitter);

    // 9. Initialize Workflow
    console.log('🔄 Initializing Workflow Service...');
    const workflowService = serviceRegistry.get('workflow');
    results.workflow = workflowService.initialize('', {
      ...commonOptions,
      // Workflow configuration
      maxRetries: parseInt(process.env.WORKFLOW_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.WORKFLOW_RETRY_DELAY) || 1000
    }, eventEmitter);

    // 10. Initialize Working
    console.log('⚙️  Initializing Working Service...');
    const workingService = serviceRegistry.get('working');
    results.working = workingService.initialize('', {
      ...commonOptions,
      // Worker configuration
      concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 3,
      pollInterval: parseInt(process.env.WORKER_POLL_INTERVAL) || 1000
    }, eventEmitter);

    // 11. Initialize Dataserve
    console.log('🗃️  Initializing Dataserve Service...');
    const dataserveService = serviceRegistry.get('dataserve');
    results.dataserve = dataserveService.initialize('', {
      ...commonOptions,
      // Data serving configuration
      provider: process.env.DATASERVE_PROVIDER || 'memory'
    }, eventEmitter);

    // Log successful initialization
    logInfo('All services initialized successfully', {
      services: Object.keys(results),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    console.log('✅ All services initialized successfully!');
    return results;

  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    logError('Service initialization failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Setup service event listeners for monitoring and debugging
 * @param {EventEmitter} eventEmitter - Event emitter instance
 */
function setupServiceEventListeners(eventEmitter) {
  const logger = getLogger();

  // Listen to all service events
  const serviceEvents = [
    'Cache Service Singleton Initialized',
    'Logging Service Singleton Initialized',
    'Filing Service Singleton Initialized',
    'Measuring Service Singleton Initialized',
    'Notifying Service Singleton Initialized',
    'Queueing Service Singleton Initialized',
    'Scheduling Service Singleton Initialized',
    'Searching Service Singleton Initialized',
    'Workflow Service Singleton Initialized',
    'Working Service Singleton Initialized',
    'Dataserve Service Singleton Initialized'
  ];

  serviceEvents.forEach(eventName => {
    eventEmitter.on(eventName, (data) => {
      logger.info(`Service event: ${eventName}`, data);
    });
  });

  // Listen to cache events
  eventEmitter.on('cache:put', (data) => {
    logger.debug('Cache PUT operation', { key: data.key });
  });

  eventEmitter.on('cache:get', (data) => {
    logger.debug('Cache GET operation', { 
      key: data.key, 
      hit: data.value !== undefined 
    });
  });

  eventEmitter.on('cache:delete', (data) => {
    logger.debug('Cache DELETE operation', { key: data.key });
  });

  // Listen to measurement events
  eventEmitter.on('measuring:add', (data) => {
    logger.debug('Metric recorded', { 
      metric: data.metricName, 
      value: data.measure?.value 
    });
  });

  // Add more event listeners as needed for other services
}

/**
 * Health check endpoint that reports service status
 * @param {Express} app - Express application instance
 */
function setupHealthCheck(app) {
  app.get('/health/services', (req, res) => {
    const status = serviceRegistry.getStatus();
    const allHealthy = Object.values(status).every(s => s.initialized);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: status
    });
  });
}

/**
 * Graceful shutdown handler
 * @param {string} signal - Shutdown signal
 */
function setupGracefulShutdown(signal) {
  process.on(signal, async () => {
    console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
    
    try {
      const logger = getLogger();
      logger.info('Graceful shutdown initiated', { signal });
      
      // Stop any running services
      const working = serviceRegistry.get('working');
      if (working.isReady()) {
        await working.stop();
      }
      
      const scheduling = serviceRegistry.get('scheduling');
      if (scheduling.isReady()) {
        // Stop scheduled jobs
      }
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
}

// Example usage in your main application
async function startApplication() {
  const app = express();
  const eventEmitter = new EventEmitter();
  
  try {
    // Initialize all services
    const services = await initializeServices(app, eventEmitter);
    
    // Setup event listeners
    setupServiceEventListeners(eventEmitter);
    
    // Setup health check
    setupHealthCheck(app);
    
    // Setup graceful shutdown
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      setupGracefulShutdown(signal);
    });
    
    // Add your routes here
    // app.use('/api', require('./routes/api'));
    
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🌟 Application started on port ${port}`);
      logInfo('Application started', { port, services: Object.keys(services) });
    });
    
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

module.exports = {
  initializeServices,
  setupServiceEventListeners,
  setupHealthCheck,
  setupGracefulShutdown,
  startApplication
};