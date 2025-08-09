# Personal Space Monitoring System

This directory contains the complete implementation of the queue-based folder monitoring solution for Personal spaces.

## Overview

The system provides:
- **Real-time file monitoring** - Watches personal space directories for changes
- **Cache-first API responses** - Personal space APIs check cache before file system
- **Queue-based processing** - Prevents race conditions and ensures reliable processing
- **Search indexing** - Automatically indexes content for fast search
- **Scalable architecture** - Each component runs independently and can be scaled

## Architecture

```
File System Changes
        ↓
  Personal Space Watcher
        ↓
  Priority-based Queues
        ↓
  ┌─────────────────────────────────┐
  │     Processing Workers          │
  ├─────────────────────────────────┤
  │ • Cache Processor               │
  │ • Content Processor             │  
  │ • Search Processor              │
  └─────────────────────────────────┘
        ↓
  Updated Cache & Search Index
        ↓
  Fast API Responses
```

## Components

### 1. File System Watcher (`personalSpaceWatcher.js`)
- Monitors `content/{username}/` directories
- Detects file changes, additions, deletions
- Queues events by priority (high/medium/low)
- Uses `chokidar` for reliable cross-platform file watching

### 2. Queue Processors

#### Cache Processor (`cacheProcessor.js`)
- Processes cache invalidation and update events
- Maintains cache consistency
- Handles cache keys: `personal:{username}:{operation}:{path}`

#### Content Processor (`contentProcessor.js`)
- Reads and processes file content
- Extracts searchable text from markdown
- Handles binary files metadata
- Triggers cache updates and search indexing

#### Search Processor (`searchProcessor.js`)
- Updates search service with processed content
- Maintains search index: `personal:{username}:{path}`
- Extracts titles and metadata for search results

### 3. Cache-First Middleware (`../middleware/personalSpaceCache.js`)
- Intercepts Personal space API requests
- Returns cached data when available
- Falls back to file system on cache miss
- Automatically caches responses for future requests

### 4. Monitoring Orchestrator (`personalSpaceMonitor.js`)
- Manages all worker processes
- Handles worker failures and restarts
- Provides health checking
- Coordinates graceful shutdown

## Getting Started

### Prerequisites
Make sure the following services are running:
- Queue service (`/api/queueing`)
- Cache service (`/api/caching`) 
- Search service (`/api/searching`)

### Installation
```bash
# Install required dependencies
npm install chokidar
```

### Starting the System
```bash
# Start the complete monitoring system
node scripts/startPersonalSpaceMonitoring.js

# Or run individual components for development
node workers/personalSpaceWatcher.js
node workers/cacheProcessor.js
node workers/contentProcessor.js
node workers/searchProcessor.js
```

### API Usage

The monitoring system automatically enhances these Personal space endpoints:

**Cache-First File Operations:**
```javascript
// Get file tree (cached)
GET /api/spaces/Personal/files

// Get file content (cached)
GET /api/spaces/Personal/content/{filePath}

// Get templates (cached)
GET /api/spaces/Personal/templates
```

**Write Operations (with cache invalidation):**
```javascript
// Create file
POST /api/spaces/Personal/files
{
  "filePath": "documents/example.md",
  "content": "# Hello World"
}

// Update file
PUT /api/spaces/Personal/content/{filePath}
{
  "content": "Updated content"
}

// Delete file
DELETE /api/spaces/Personal/content/{filePath}
```

## Configuration

### File Priorities
Files are processed with different priorities:
- **High**: Config files, templates, JSON files
- **Medium**: Markdown content files
- **Low**: Assets, images, logs

### Cache Keys
The system uses structured cache keys:
- `personal:{username}:content:{path}` - File content
- `personal:{username}:meta:{path}` - File metadata
- `personal:{username}:tree` - Directory tree
- `personal:{username}:templates` - Templates list

### Queue Names
Processing queues by priority:
- `file-events` - Raw file system events
- `cache-updates-{priority}` - Cache operations
- `content-processing-{priority}` - Content indexing
- `search-indexing-{priority}` - Search updates

## Monitoring & Health Checks

### Health Check Endpoints
```bash
# Check queue sizes
curl http://localhost:3001/api/queueing/size/file-events

# Check service status
curl http://localhost:3001/api/queueing/status
curl http://localhost:3001/api/caching/status
curl http://localhost:3001/api/searching/status
```

### Logs
Monitor the console output for:
- File system events being queued
- Cache hits/misses
- Processing worker status
- Error conditions and restarts

## Benefits

### For Users
- **Instant response times** - File listings and content served from cache
- **Real-time updates** - Changes reflected immediately
- **Fast search** - Content automatically indexed
- **Reliable operations** - No lost updates or race conditions

### For Developers
- **Scalable architecture** - Workers can be scaled independently
- **Easy monitoring** - Clear logs and health checks
- **Fault tolerant** - Automatic error recovery
- **Cache consistency** - Automatic invalidation on writes

## Troubleshooting

### Common Issues

1. **Services not starting**
   - Check that base services (queue, cache, search) are running
   - Verify port 3001 is available
   - Check file permissions on content directory

2. **Cache misses**
   - Verify cache service is responding
   - Check cache key generation
   - Monitor worker processing logs

3. **Missing file changes**
   - Check file watcher is running
   - Verify file paths are within personal space
   - Monitor queue sizes for backlogs

### Debug Mode
Set environment variables for verbose logging:
```bash
export DEBUG=true
node scripts/startPersonalSpaceMonitoring.js
```

## Development

### Adding New File Types
1. Update priority logic in `personalSpaceWatcher.js`
2. Add content processing in `contentProcessor.js`
3. Update search text extraction as needed

### Custom Cache Strategies
1. Modify cache key generation in middleware
2. Adjust TTL values for different content types
3. Add cache warming strategies if needed

### Performance Tuning
1. Monitor queue sizes under load
2. Adjust worker count for heavy processing
3. Optimize cache hit ratios
4. Consider Redis for distributed caching