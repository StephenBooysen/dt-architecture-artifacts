# Singleton Services Architecture

This directory contains the singleton implementation of all services in the Architecture Artifacts platform. All services have been refactored to use the singleton pattern for better resource management, global access, and consistency.

## 🏗️ Architecture Overview

### Base Singleton Class
- **`base/ServiceSingleton.js`** - Base class that all service singletons extend
- Provides common initialization, reset, and status checking functionality
- Ensures consistent behavior across all services

### Service Registry
- **`index.js`** - Centralized registry for all singleton services
- Provides unified access to all services
- Includes bulk operations (initialize all, reset all, status check)

### Utility Functions
- **`../utils/services.js`** - Helper functions for easy service access
- Convenience methods for common operations
- Error handling for service interactions

## 📦 Available Services

| Service | Singleton Path | Purpose |
|---------|---------------|---------|
| **Caching** | `caching/singleton.js` | Key-value cache (Memory/Redis/Memcached) |
| **Dataserve** | `dataserve/singleton.js` | Data serving and management |
| **Filing** | `filing/singleton.js` | File operations (Local/Git/S3/FTP) |
| **Logging** | `logging/singleton.js` | Structured logging (Console/File) |
| **Measuring** | `measuring/singleton.js` | Metrics and measurements |
| **Notifying** | `notifying/singleton.js` | Notifications (Email/SMS/Webhook) |
| **Queueing** | `queueing/singleton.js` | Task queue management |
| **Scheduling** | `scheduling/singleton.js` | Cron-like job scheduling |
| **Searching** | `searching/singleton.js` | Full-text search capabilities |
| **Workflow** | `workflow/singleton.js` | Business process automation |
| **Working** | `working/singleton.js` | Background job processing |

## 🚀 Quick Start

### 1. Initialize Services (in your main server file)

```javascript
const serviceRegistry = require('./src/services/index');
const { EventEmitter } = require('events');

const app = express();
const eventEmitter = new EventEmitter();

// Initialize all services at once
const services = serviceRegistry.initializeAll({
  'express-app': app,
  // Add common configuration
}, eventEmitter);

// Or initialize individual services
const cacheService = serviceRegistry.cache;
cacheService.initialize('redis', {
  'express-app': app,
  host: 'localhost',
  port: 6379
}, eventEmitter);
```

### 2. Use Services in Your Routes

```javascript
const { getCache, getLogger, recordMetric } = require('./src/utils/services');

app.get('/api/data/:id', async (req, res) => {
  const logger = getLogger();
  const cache = getCache();
  
  try {
    // Try cache first
    let data = await cache.get(`data:${req.params.id}`);
    
    if (!data) {
      // Fetch from database
      data = await fetchDataFromDB(req.params.id);
      await cache.put(`data:${req.params.id}`, data);
      logger.info('Data cached', { id: req.params.id });
    }
    
    recordMetric('data.requests', 1, { id: req.params.id });
    res.json(data);
    
  } catch (error) {
    logger.error('Error fetching data', { 
      id: req.params.id, 
      error: error.message 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 3. Direct Service Access

```javascript
const serviceRegistry = require('./src/services/index');

// Get specific service
const cacheService = serviceRegistry.get('cache');
await cacheService.put('key', 'value');

// Or use convenience getters
const cache = serviceRegistry.cache;
const logger = serviceRegistry.logging;
const filing = serviceRegistry.filing;
```

## 🔧 Configuration

### Environment Variables

```bash
# Cache Configuration
CACHE_TYPE=redis|memory|memcached
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0

# Filing Configuration
FILING_TYPE=local|git|s3|ftp
FILES_BASE_PATH=./content
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=your-bucket

# Logging Configuration
LOG_LEVEL=info|debug|warn|error

# And more for other services...
```

### Programmatic Configuration

```javascript
// Configure individual services
const cacheService = serviceRegistry.cache;
cacheService.initialize('redis', {
  'express-app': app,
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  // Redis-specific options
  retryDelayOnFailover: 1000,
  maxRetriesPerRequest: 3
}, eventEmitter);
```

## 🧪 Testing

### Unit Tests

```javascript
const cacheService = require('../../server/src/services/caching/singleton');

describe('Cache Service', () => {
  beforeEach(() => {
    cacheService.reset(); // Reset singleton state
  });
  
  afterEach(() => {
    cacheService.reset();
  });

  it('should cache and retrieve values', async () => {
    const cache = cacheService.initialize('memory', {}, mockEventEmitter);
    
    await cache.put('test', 'value');
    const result = await cache.get('test');
    expect(result).toBe('value');
  });
});
```

### Integration Tests

```javascript
const serviceRegistry = require('../../server/src/services/index');

describe('Services Integration', () => {
  beforeAll(async () => {
    await serviceRegistry.initializeAll({}, mockEventEmitter);
  });
  
  afterAll(() => {
    serviceRegistry.resetAll();
  });

  it('should work together', async () => {
    const cache = serviceRegistry.cache;
    const logger = serviceRegistry.logging;
    
    await cache.put('integration', 'test');
    logger.info('Integration test passed');
  });
});
```

## 📊 Monitoring and Health Checks

### Health Check Endpoint

```javascript
app.get('/health/services', (req, res) => {
  const status = serviceRegistry.getStatus();
  const allHealthy = Object.values(status).every(s => s.initialized);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    services: status
  });
});
```

### Service Events

```javascript
eventEmitter.on('Cache Service Singleton Initialized', (data) => {
  console.log('Cache service ready:', data);
});

eventEmitter.on('cache:put', (data) => {
  console.log('Cache operation:', data.key);
});
```

## 🎯 Best Practices

### 1. Initialize Early
- Initialize all services during application startup
- Handle initialization errors gracefully
- Use environment-specific configurations

### 2. Use Utility Functions
- Prefer utility functions over direct service access
- Handle service unavailability gracefully
- Log service interactions for debugging

### 3. Error Handling
```javascript
const { getCache, logError } = require('./src/utils/services');

async function cacheOperation(key, value) {
  try {
    const cache = getCache();
    if (cache.isReady()) {
      await cache.put(key, value);
    }
  } catch (error) {
    logError('Cache operation failed', { key, error: error.message });
    // Continue without caching
  }
}
```

### 4. Testing
- Always reset singletons in test setup/teardown
- Test singleton behavior specifically
- Use integration tests for cross-service functionality

### 5. Configuration Management
- Use environment variables for different deployments
- Provide sensible defaults
- Validate configuration at startup

## 🔄 Migration Guide

### From Factory Pattern

**Before:**
```javascript
const createCache = require('./src/services/caching');
const cache = createCache('memory', options, eventEmitter);
```

**After:**
```javascript
const cacheService = require('./src/services/caching/singleton');
const cache = cacheService.initialize('memory', options, eventEmitter);

// Or use the registry
const { getCache } = require('./src/utils/services');
const cache = getCache();
```

### Update Tests

**Before:**
```javascript
beforeEach(() => {
  cache = createCache('memory', {}, mockEventEmitter);
});
```

**After:**
```javascript
beforeEach(() => {
  cacheService.reset();
  cache = cacheService.initialize('memory', {}, mockEventEmitter);
});

afterEach(() => {
  cacheService.reset();
});
```

## 🚨 Breaking Changes

1. **Service Initialization**: Services must be explicitly initialized before use
2. **Test Setup**: Tests must reset singletons between runs  
3. **Import Paths**: Updated import paths to singleton modules
4. **Error Handling**: Services may throw initialization errors

## 💡 Advanced Usage

### Custom Service Configuration
```javascript
const serviceRegistry = require('./src/services/index');

// Configure cache with custom TTL and memory limits
const cacheService = serviceRegistry.cache;
cacheService.initialize('memory', {
  'express-app': app,
  maxSize: 1000,
  defaultTTL: 300000, // 5 minutes
  checkPeriod: 60000   // Clean expired every minute
}, eventEmitter);
```

### Cross-Service Workflows
```javascript
const { getCache, getFiling, getLogger, recordMetric } = require('./src/utils/services');

async function processFile(filePath) {
  const timer = Date.now();
  const logger = getLogger();
  const cache = getCache();
  const filing = getFiling();
  
  try {
    // Check cache first
    let content = await cache.get(`file:${filePath}`);
    
    if (!content) {
      // Read from file system
      content = await filing.readFile(filePath);
      await cache.put(`file:${filePath}`, content);
      logger.info('File cached', { path: filePath });
    }
    
    // Record metrics
    recordMetric('file.process.duration', Date.now() - timer);
    recordMetric('file.process.success', 1, { path: filePath });
    
    return content;
    
  } catch (error) {
    logger.error('File processing failed', { 
      path: filePath, 
      error: error.message 
    });
    recordMetric('file.process.error', 1, { path: filePath });
    throw error;
  }
}
```

For more examples, see the `/examples` directory.