# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Architecture Artifacts Editor** - a comprehensive enterprise architecture documentation platform with glassmorphism theme, featuring a modern markdown editor, microservices management platform, and multi-client ecosystem. It's a full-stack application with React frontend, Express.js backend, Electron desktop app, and browser extensions that provides file management, Git integration, collaborative editing capabilities, and enterprise-grade microservices management.

## Development Commands

### Setup and Installation
```bash
# Install all dependencies (root and client)
npm run install-deps

# Start development servers (both frontend and backend)
npm run dev

# Start backend server only
npm run server

# Start frontend only (must run from client directory)
npm run client

# Start desktop application with server
npm run electron
```

### Testing
```bash
# Run all tests (both client and server)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only client tests
npm run test:client

# Run only server tests
npm run test:server
```

### Building
```bash
# Build frontend for production
npm run build
```

## Architecture Overview

### Backend Structure (server/)
- **server/index.js**: Main Express server with comprehensive API endpoints
  - File CRUD operations with security (path traversal protection)
  - Git integration (commit, push, pull, clone, status) 
  - File upload/download with multer
  - API monitoring dashboard with call logging
  - Security middleware (helmet, CORS, rate limiting)
  - Support for multiple file types (markdown, images, PDFs, text)
  - Service management with dedicated UI pages for each microservice
  - Dashboard with 4-column grid layout showing service status indicators

- **server/src/services/**: Microservices architecture (11 integrated services)
  - **searching/**: JSON data storage and text search service
    - **provider/searching.js**: Core search logic with Map-based storage
    - **routes/index.js**: REST API endpoints for add/delete/search operations
    - **index.js**: Service factory and initialization
  - **caching/**: Multi-provider caching (Redis, Memcached, In-memory)
    - **providers/**: caching.js, cachingRedis.js, cachingMemcached.js
  - **filing/**: Multi-cloud file storage (Local, FTP, AWS S3)
    - **providers/**: filingLocal.js, filingFtp.js, filingS3.js
  - **dataserve/**: Database operations and data management
    - **providers/**: dataserve.js, dataservefiles.js
  - **logging/**: Structured logging with multiple output targets
    - **providers/**: consoleLogger.js, fileLogger.js
  - **queueing/**: Message queue management
    - **providers/**: InMemoryQueue.js
  - **measuring/**: Metrics collection and monitoring
  - **notifying/**: Multi-channel notification system
  - **scheduling/**: Cron-based task scheduling
  - **working/**: Background worker processes
    - **providers/**: workingProvider.js, workerScript.js
  - **workflow/**: Step-based workflow engine
    - **provider/**: workerRunner.js
  - Each service includes provider logic, API routes, status monitoring, and health checks

### Frontend Structure (client/src/)
- **App.js**: Main React component managing application state
  - File tree navigation with CRUD operations
  - Resizable sidebar with collapse functionality
  - Editor mode persistence (edit/preview/split)
  - Real-time content synchronization
  
- **components/**: React components
  - **FileTree.js**: File/folder navigation with upload support
  - **MarkdownEditor.js**: Multi-format editor with preview
  - **GitIntegration.js**: Git operations UI
  - **PublishModal.js**: Publishing workflow
  - **PreviewWindow.js**: File content preview for various formats
  - **ImageViewer.js**, **PDFViewer.js**, **TextViewer.js**: Format-specific viewers
  - **CommitModal.js**: Git commit interface
  - **FileDownloader.js**: File download functionality
  - **TemplateManager.js**: Content template management
  - **Auth/**: Authentication components (LoginModal.js, RegisterModal.js)

- **contexts/**: React Context providers
  - **AuthContext.js**: Authentication state management
  - **ThemeContext.js**: Theme and appearance settings

- **services/api.js**: Centralized API client with axios
  - All backend communication
  - Error handling and response processing
  - File operations, Git operations, upload/download
  - Authentication and session management

- **utils/**: Utility functions
  - **fileTypeDetector.js**: File type detection and validation

### Key Features
- **Multi-format support**: Markdown, images, PDFs, text files
- **Git integration**: Full repository management (clone, pull, commit, push)
- **File upload/download**: Drag-and-drop and manual upload
- **Glassmorphism UI**: Modern glass-like interface with blur effects
- **API monitoring**: Built-in dashboard for tracking API calls
- **Security**: Path traversal protection, rate limiting, file validation
- **Multi-Client Ecosystem**: Web, desktop (Electron), and browser extensions
- **Microservices Management**: Dedicated UI for 11 microservices with real-time status monitoring
- **Search Service**: JSON data storage with recursive text search across nested objects
- **Service Dashboard**: 4-column grid layout with service icons, status indicators, and names
- **Authentication**: Passport.js with local authentication and session management
- **Template System**: JSON-based content templates for meeting notes and daily feedback
- **Load Testing**: Comprehensive performance testing framework for all services
- **Multi-Provider Support**: Caching (Redis, Memcached), Filing (Local, FTP, S3)

## Content Management
- Content is stored in the `content/` directory
- Files are organized in a hierarchical structure
- Git operations work on the entire content directory
- File type detection is automatic based on extensions
- Content templates are stored in `content-templates/` directory as JSON files
- Template system supports dynamic content generation for meeting notes and daily feedback

## Test Configuration
- **Jest** configuration in `tests/jest.config.js`
- Coverage thresholds set to 70% across all metrics
- Test files located in `tests/` directory
- Supports both client and server testing with jsdom environment
- **Load Testing**: Framework in `tests-load/` with individual service load tests
- **API Testing**: HTTP-based testing in `tests-api/` with .http files for each service
- **Mock System**: Test mocks and fixtures in `tests/mocks/`
- **Comprehensive Coverage**: Unit tests, integration tests, and performance tests

## Important Implementation Notes

### File Operations
- All file paths are validated to prevent directory traversal attacks (server/index.js:264, 333, 477)
- File type detection is handled by `detectFileType()` function (server/index.js:188)
- Content directory is automatically created if it doesn't exist

### Git Integration  
- Git operations use `simple-git` library
- Repository cloning clears existing content directory
- All Git commands work from the content directory context

### API Monitoring
- All API calls are logged in memory (max 1000 calls)
- Monitoring dashboard available at `/api-monitor`
- Captures timing, response size, and request details

### Security Features
- Helmet.js for security headers
- CORS protection
- Rate limiting (100 requests per 15 minutes)
- File upload size limit (10MB)
- Path traversal protection on all file operations

### Microservices Architecture
- **Service Discovery**: Each service registers with the main server
- **Health Monitoring**: Real-time status checking for all services
- **Tabbed UI**: Each service has a dedicated management interface
- **Event-Driven**: Services use EventEmitter for communication
- **Modular Design**: Services can be independently developed and deployed

### Multi-Client Architecture
- **Web Client**: Full-featured React application (`client/`)
- **Desktop Client**: Electron application with native OS integration (`client-electron/`)
  - Cross-platform support (Windows, macOS, Linux)
  - Native file system access and OS notifications
  - Same React codebase as web client
- **Browser Extensions**: Chrome and Edge extensions (`client-extensions/`)
  - Quick search access from any webpage
  - Configurable server connection
  - Manifest V3 compatible

### Authentication System
- **Passport.js**: Local authentication strategy with session management
- **User Storage**: File-based user storage in `server/src/auth/users.json`
- **Session Management**: Express sessions with secure configuration
- **Authorization**: Role-based access control for API endpoints

### Search Service Implementation
- **Data Storage**: Uses Map for in-memory JSON object storage with UUID keys
- **Search Algorithm**: Recursive case-insensitive text search across nested JSON structures
- **API Endpoints**: 
  - `POST /api/searching/add/` - Add JSON data with auto-generated key
  - `DELETE /api/searching/delete/:key` - Remove data by key
  - `GET /api/searching/search/:term` - Search for text across all stored data
  - `GET /api/searching/status` - Service health check
- **UI Features**: Tabbed interface for Add Data, Search Data, Delete Data operations

### Multi-Provider Services
- **Caching Service**: Supports Redis, Memcached, and in-memory caching
- **Filing Service**: Supports local filesystem, FTP, and AWS S3 storage
- **Logging Service**: Console and file-based logging with configurable levels

## Development Tips
- Use `npm run dev` for full development experience
- Backend runs on port 5000, frontend on port 3000
- Use `npm run electron` for desktop application development
- Client has proxy configuration to backend
- File changes trigger automatic refreshes in file tree
- Editor mode preference is saved to localStorage
- Access service UIs at `/services/{service-name}` (e.g., `/services/searching`)
- Monitor API calls at `/monitoring/api`
- All services auto-register and appear on dashboard with status indicators
- Load unpacked browser extensions from `client-extensions/google/` or `client-extensions/edge/`
- Use template system with JSON files in `content-templates/` for dynamic content
- Run tests frequently with `npm test` or `npm run test:watch`
- Use load testing framework in `tests-load/` for performance validation
- API testing available in `tests-api/` with HTTP request files