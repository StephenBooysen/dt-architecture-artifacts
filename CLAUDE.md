# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Architecture Artifacts Editor** - a modern markdown editor with glassmorphism theme built for managing architecture documentation. It's a full-stack application with React frontend and Express.js backend that provides file management, Git integration, and collaborative editing capabilities.

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

- **services/api.js**: Centralized API client with axios
  - All backend communication
  - Error handling and response processing
  - File operations, Git operations, upload/download

### Key Features
- **Multi-format support**: Markdown, images, PDFs, text files
- **Git integration**: Full repository management (clone, pull, commit, push)
- **File upload/download**: Drag-and-drop and manual upload
- **Glassmorphism UI**: Modern glass-like interface with blur effects
- **API monitoring**: Built-in dashboard for tracking API calls
- **Security**: Path traversal protection, rate limiting, file validation

## Content Management
- Content is stored in the `content/` directory
- Files are organized in a hierarchical structure
- Git operations work on the entire content directory
- File type detection is automatic based on extensions

## Test Configuration
- **Jest** configuration in `tests/jest.config.js`
- Coverage thresholds set to 70% across all metrics
- Test files located in `tests/` directory
- Supports both client and server testing with jsdom environment

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

## Development Tips
- Use `npm run dev` for full development experience
- Backend runs on port 5000, frontend on port 3000
- Client has proxy configuration to backend
- File changes trigger automatic refreshes in file tree
- Editor mode preference is saved to localStorage