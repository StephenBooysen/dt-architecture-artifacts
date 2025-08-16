/**
 * @fileoverview Centralized server configuration management.
 * Handles environment variables, defaults, and server settings.
 */

const dotenv = require('dotenv');
const path = require('path');

/**
 * Load environment configuration
 */
function loadEnvironment() {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const envFile = path.join(__dirname, '..', '..', '..', `.env.${NODE_ENV}`);
  
  // Load the environment-specific file first
  dotenv.config({ path: envFile });
  
  // Load the base .env file as fallback (if it exists)
  dotenv.config();
  
  return NODE_ENV;
}

/**
 * Get server configuration object
 */
function getServerConfig() {
  const NODE_ENV = loadEnvironment();
  
  return {
    NODE_ENV,
    PORT: process.env.PORT || 5000,
    
    // CORS Configuration
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS 
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(url => url.trim())
      : [process.env.CLIENT_URL || 'http://localhost:3000'],
    
    // Session Configuration
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    
    // File paths
    CONTENT_PATH: process.env.CONTENT_PATH || './content',
    FILING_PROVIDER: process.env.FILING_PROVIDER || 'local',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    
    // Security settings
    SECURE_COOKIES: NODE_ENV === 'production',
    
    // API limits
    MAX_API_CALLS: 1000,
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100,
    
    // Request limits
    REQUEST_SIZE_LIMIT: '105mb'
  };
}

/**
 * Print server startup information
 */
function printStartupInfo(config) {
  console.log('🚀 Design Artifacts Server Started');
  console.log('=====================================');
  console.log(`📡 Server running on port: ${config.PORT}`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`📁 Filing Provider: ${config.FILING_PROVIDER}`);
  console.log(`🔗 Client URL: ${config.CLIENT_URL}`);
  console.log(`📦 Content Path: ${config.CONTENT_PATH}`);
  console.log(`🔐 Secure Cookies: ${config.SECURE_COOKIES}`);
  console.log('=====================================');
  
  // Log environment file loaded
  console.log(`📄 Loaded environment from: .env.${config.NODE_ENV}`);
  
  if (config.NODE_ENV === 'development') {
    console.log('🔧 Development mode features enabled');
    console.log('  - Hot reload: enabled');
    console.log('  - Source maps: enabled');
    console.log('  - Request logging: enabled');
  } else if (config.NODE_ENV === 'production') {
    console.log('🔒 Production mode optimizations enabled');
    console.log('  - Compression: enabled');
    console.log('  - Secure cookies: enabled');
    console.log('  - Source maps: disabled');
  }
}

module.exports = {
  loadEnvironment,
  getServerConfig,
  printStartupInfo
};