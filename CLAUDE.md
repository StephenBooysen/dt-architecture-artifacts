# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Architecture Artifacts Editor** - a comprehensive enterprise architecture documentation platform with glassmorphism theme, featuring a modern markdown editor, microservices management platform, multi-client ecosystem, and knowledge view functionality. It's a full-stack application with React frontend, Express.js backend, Electron desktop app, browser extensions, and file watcher service that provides file management, Git integration, collaborative editing capabilities, enterprise-grade microservices management, and intelligent knowledge discovery.

## Development Commands

### Setup and Installation
```bash
# Install all dependencies (root, client, electron, extensions, watcher)
npm run install-deps

# Start development servers (both frontend and backend)
npm run dev

# Start backend server only
npm run server

# Start frontend only (must run from client directory)
npm run client

# Start desktop application with server
npm run electron

# Start file watcher service
npm run watcher

# Start UI mockup server
npm run ui
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

# Run Playwright E2E tests
npm run test:playwright

# Run tests with UI
npm run test:playwright:ui
```

### Building
```bash
# Build frontend for production
npm run build
```

## Key Features

- **Multi-format support**: Markdown, images, PDFs, text files with automatic type detection
- **Git integration**: Full repository management (clone, pull, commit, push, status)
- **File upload/download**: Drag-and-drop and manual upload with security validation
- **Glassmorphism UI**: Modern glass-like interface with blur effects and transparency
- **Knowledge View**: Read-only interface for content exploration with intelligent search
- **Content Search**: Content-aware search with file and content matching, contextual previews
- **Space Navigation**: Multi-space support with readonly and editable spaces
- **API monitoring**: Built-in dashboard for tracking API calls and performance
- **Security**: Path traversal protection, rate limiting, file validation
- **Multi-Client Ecosystem**: Web, desktop (Electron), browser extensions, and VS Code extension
- **File Watcher**: Automated content synchronization and monitoring service
- **Microservices Management**: Dedicated UI for 11 microservices with real-time status monitoring
- **Authentication**: Passport.js with local authentication and session management
- **Template System**: JSON-based content templates for meeting notes and daily feedback
- **Load Testing**: Comprehensive performance testing framework for all services
- **Multi-Provider Support**: Caching (Redis, Memcached), Filing (Local, FTP, S3)
- **UI Prototyping**: Static HTML mockups for architecture viewpoints
- **E2E Testing**: Playwright-based end-to-end testing for complete workflows

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
  - Knowledge view integration
  
- **components/**: React components
  - **FileTree.js**: File/folder navigation with upload support
  - **MarkdownEditor.js**: Multi-format editor with preview
  - **KnowledgeContentPane.js**: Knowledge view content display with rich markdown rendering
  - **KnowledgeSearchPane.js**: Knowledge view search results pane with space navigation
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

### Multi-Client Ecosystem
- **Web Client**: Full-featured React application (`client/`)
- **Desktop Client**: Electron application with native OS integration (`client-electron/`)
  - Cross-platform support (Windows, macOS, Linux)
  - Native file system access and OS notifications
  - Same React codebase as web client
- **Browser Extensions**: Chrome, Edge, and VS Code extensions (`client-extensions/`)
  - Quick search access from any webpage or editor
  - Configurable server connection
  - Manifest V3 compatible
- **File Watcher Service**: Automated content synchronization (`client-watcher/`)
  - Chokidar-based file system monitoring
  - Configurable watch patterns and sync options
  - API client for automated content updates

## Content Management
- Content is stored in the `content/` directory with space-based organization
- Files are organized in a hierarchical structure with multi-tenant support
- Git operations work on the entire content directory
- File type detection is automatic based on extensions
- Content templates are stored in `content-templates/` directory as JSON files
- Template system supports dynamic content generation for meeting notes and daily feedback
- Knowledge view provides read-only access to content with intelligent search capabilities
- Space navigation allows switching between different content spaces

## Test Configuration
- **Jest** configuration in `tests/jest.config.js`
- Coverage thresholds set to 70% across all metrics
- Test files located in `tests/` directory
- Supports both client and server testing with jsdom environment
- **Load Testing**: Framework in `tests-load/` with individual service load tests
- **API Testing**: HTTP-based testing in `tests-api/` with .http files for each service
- **E2E Testing**: Playwright tests in `tests-playwright/` for complete user workflows
- **Mock System**: Test mocks and fixtures in `tests/mocks/`
- **Comprehensive Coverage**: Unit tests, integration tests, E2E tests, and performance tests

## Important Implementation Notes

### Knowledge View Components
- **KnowledgeContentPane.js**: Provides read-only content display with rich markdown rendering
- **KnowledgeSearchPane.js**: Handles search results display and space navigation
- Uses React Markdown with syntax highlighting for code blocks
- Implements glassmorphism design with confluence-themed styling
- Supports contextual search with content previews and highlighting

### File Operations
- All file paths are validated to prevent directory traversal attacks (server/index.js:264, 333, 477)
- File type detection is handled by `detectFileType()` function (server/index.js:188)
- Content directory is automatically created if it doesn't exist
- Space-based content organization with configurable access controls

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
- **Event-Driven**: Services use EventEmitter for communication
- **Modular Design**: Services can be independently developed and deployed

### Multi-Provider Services
- **Caching Service**: Supports Redis, Memcached, and in-memory caching
- **Filing Service**: Supports local filesystem, FTP, and AWS S3 storage
- **Logging Service**: Console and file-based logging with configurable levels

## Development Tips
- Use `npm run dev` for full development experience
- Backend runs on port 5000, frontend on port 3000
- Use `npm run electron` for desktop application development
- Use `npm run watcher` for automated content synchronization
- Use `npm run ui` for static UI mockup development
- Use `npm run test:playwright` for end-to-end testing
- Client has proxy configuration to backend
- File changes trigger automatic refreshes in file tree
- Editor mode preference is saved to localStorage
- Access service UIs at `/services/{service-name}` (e.g., `/services/searching`)
- Monitor API calls at `/monitoring/api`
- All services auto-register and appear on dashboard with status indicators
- Load unpacked browser extensions from `client-extensions/google/` or `client-extensions/edge/`
- VS Code extension available in `client-extensions/vscode/`
- Use template system with JSON files in `content-templates/` for dynamic content
- Knowledge view provides read-only content exploration with intelligent search
- File watcher service automatically syncs content changes from `client-watcher/`
- UI prototypes available in `ui/public/` for architecture viewpoint mockups
- Run tests frequently with `npm test` or `npm run test:watch`
- Use load testing framework in `tests-load/` for performance validation
- API testing available in `tests-api/` with HTTP request files
- E2E testing with Playwright in `tests-playwright/`

## Project Structure Highlights

- **Multi-client architecture**: Web app, desktop app, browser extensions, VS Code extension
- **Microservices**: 11 integrated services with health monitoring
- **Knowledge system**: Read-only knowledge view with intelligent search
- **File watcher**: Automated content synchronization
- **UI prototyping**: Static HTML mockups for architecture viewpoints
- **Comprehensive testing**: Unit, integration, E2E, load, and API testing
- **Template system**: JSON-based content templates
- **Multi-provider support**: Flexible caching and file storage options
- **Plugin system**: Extensible document processing capabilities