/**
 * @fileoverview Express server for Design Artifacts application (Refactored).
 * 
 * This server provides a REST API for managing markdown files, folders, and Git operations
 * in a content management system. It includes features for file upload, download, editing,
 * and comprehensive Git integration with monitoring capabilities.
 * 
 * Refactored version with modular architecture for better maintainability.
 * 
 * @author Design Artifacts Team
 * @version 2.0.0
 * @since 2025-01-01
 */

const express = require('express');
const path = require('path');
const EventEmitter = require('events');

// Import configuration and middleware
const { getServerConfig, printStartupInfo } = require('./src/config/server');
const { configureHelmet, configureCORS, configureRateLimit } = require('./src/middleware/security');
const { configureSession, requireServerAuth } = require('./src/middleware/auth');
const { createApiMonitoring } = require('./src/middleware/apiMonitoring');

// Import routes
const apiRoutes = require('./src/routes/index');
const authRoutes = require('./src/routes/server/auth');
const pageRoutes = require('./src/routes/server/pages');
const managementRoutes = require('./src/routes/server/management');

// Import utilities
const passport = require('./src/auth/passport');
const PluginLoader = require('./src/utils/pluginLoader');

// Import service container
const { registerServices, validateServiceConfiguration, container } = require('./src/services/serviceRegistration');

// Initialize server configuration
const config = getServerConfig();
const app = express();

// Initialize plugin loader
const pluginLoader = new PluginLoader(path.join(__dirname, 'plugins'));
let pluginMiddleware = null;

// Initialize API monitoring
const apiMonitoring = createApiMonitoring(config.MAX_API_CALLS);

// Make services available to routes
app.locals.apiCalls = apiMonitoring.apiCalls;
app.locals.pluginLoader = pluginLoader;

/**
 * Patches an EventEmitter instance to intercept and log all emitted events.
 */
function patchEmitter(emitter) {
  const originalEmit = emitter.emit;

  emitter.emit = function () {
    const eventName = arguments[0];
    const args = Array.from(arguments).slice(1);

    //console.log(`Caught event: "${eventName}" with arguments:`, args);

    return originalEmit.apply(this, arguments);
  };
}

const eventEmitter = new EventEmitter();
patchEmitter(eventEmitter);

/**
 * Initialize all services using the DI container
 */
function initializeServices() {
  console.log('🔧 Setting up services with DI container...');
  
  // Register all services with the container
  registerServices();
  
  // Validate service configuration
  const validation = validateServiceConfiguration();
  if (!validation.valid) {
    console.error('❌ Service configuration validation failed:');
    validation.issues.forEach(issue => console.error(`  - ${issue}`));
    throw new Error('Service configuration validation failed');
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Service configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  // Initialize all services with common options
  const commonOptions = { 'express-app': app };
  const serviceInstances = container.initializeAll(commonOptions, eventEmitter);
  
  // Get logging service and log startup
  const log = container.get('logging');
  log.log("Server", "Server Started up at " + new Date());
  
  // Make container available to the app
  app.locals.serviceContainer = container;
  
  console.log(`📊 Initialized ${Object.keys(serviceInstances).length} services via DI container`);
  
  return { log, container, serviceInstances };
}

/**
 * Initialize and load all available plugins for the server.
 */
async function initializePlugins() {
  try {
    console.log('🔌 Loading plugins...');
    await pluginLoader.loadAllPlugins();
    pluginMiddleware = pluginLoader.createPluginMiddleware(app);
    app.locals.pluginMiddleware = pluginMiddleware;
    console.log('✅ Plugins initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize plugins:', error);
  }
}

/**
 * Configure middleware stack
 */
function configureMiddleware() {
  // Security middleware
  app.use(configureHelmet());
  app.use(configureCORS(config.CORS_ALLOWED_ORIGINS));
  
  // Body parsing middleware
  app.use(express.json({ limit: config.REQUEST_SIZE_LIMIT }));
  app.use(express.urlencoded({ limit: config.REQUEST_SIZE_LIMIT, extended: true }));

  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, 'public')));

  // Session configuration
  app.use(configureSession(config));

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // API call logging for monitoring
  app.use('/api', apiMonitoring.logApiCall);

  // Plugin middleware for request/response interception
  app.use('/api', (req, res, next) => {
    if (pluginMiddleware) {
      pluginMiddleware.interceptRequest(req, res, next);
    } else {
      next();
    }
  });

  app.use('/api', (req, res, next) => {
    if (pluginMiddleware) {
      pluginMiddleware.interceptResponse(req, res, next);
    } else {
      next();
    }
  });

  // Rate limiting (commented out for now)
  // const limiter = configureRateLimit(config.RATE_LIMIT_WINDOW, config.RATE_LIMIT_MAX);
  // app.use('/api/', limiter);
}

/**
 * Configure routes
 */
function configureRoutes() {
  // API routes (from existing routes)
  app.use('/api', apiRoutes);
  
  // Server administration routes
  app.use('/', authRoutes);
  app.use('/', pageRoutes);
  app.use('/', managementRoutes);
}

/**
 * Start the server
 */
async function startServer() {
  // Initialize services
  const { log, container, serviceInstances } = initializeServices();
  
  // Configure middleware
  configureMiddleware();
  
  // Configure routes
  configureRoutes();
  
  // Start listening
  app.listen(config.PORT, async () => {
    printStartupInfo(config);
    
    // Start the git space scheduler
    try {
      const gitSpaceScheduler = require('./src/services/gitSpaceScheduler');
      gitSpaceScheduler.initialize(container);
      gitSpaceScheduler.start();
      console.log('📅 Git space scheduler started');
    } catch (error) {
      console.error('Failed to start git space scheduler:', error);
    }
    
    // Initialize plugins after server startup
    await initializePlugins();
    
    // Log service container status
    const serviceStatus = container.getStatus();
    const initializedServices = Object.values(serviceStatus).filter(s => s.initialized).length;
    console.log(`📊 Service Container Status: ${initializedServices}/${Object.keys(serviceStatus).length} services initialized`);
    
    console.log('=====================================');
    console.log('✅ Server initialization complete');
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});