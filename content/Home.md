# Architecture Artifacts Editor

A comprehensive enterprise architecture documentation platform with glassmorphism theme, featuring a modern markdown editor, microservices management platform, and multi-client ecosystem. Built for architects, product owners, and business analysts to capture, manage, and analyze architecture documentation with Git integration, collaborative editing, and comprehensive service monitoring across web, desktop, and browser extension clients.

## Features

### Document Management
- **Glassmorphism UI**: Modern glass-like interface with blur effects and transparency
- **File Tree Navigation**: Browse and manage files and folders in the left sidebar
- **Markdown Editor**: Rich text editing with syntax highlighting
- **Live Preview**: Real-time markdown preview with GitHub Flavored Markdown support
- **Split View**: Edit and preview simultaneously
- **Multi-format Support**: Handle markdown, images, PDFs, and text files
- **File Upload/Download**: Drag-and-drop and manual file management

### Git Integration
- **Version Control**: Commit and push changes directly from the editor
- **Repository Management**: Clone, pull, and manage Git repositories
- **Change Tracking**: View repository status and file changes

### Microservices Management
- **Service Dashboard**: 4-column grid layout with real-time status monitoring
- **11 Integrated Services**: Logging, Caching, Queueing, Measuring, Notifying, Scheduling, Searching, Working, Workflow, Filing, and DataServe
- **Service UIs**: Dedicated management interfaces for each microservice
- **Health Monitoring**: Real-time status indicators for all services
- **API Monitoring**: Built-in dashboard for tracking API calls and performance
- **Load Testing**: Comprehensive load testing framework for all services
- **API Testing**: HTTP-based API testing with dedicated test files

### Search Service
- **JSON Data Storage**: Store and manage JSON objects with auto-generated keys
- **Text Search**: Recursive case-insensitive search across nested JSON structures
- **REST API**: Full CRUD operations for data management
- **Tabbed Interface**: Intuitive UI for adding, searching, and deleting data

### Security & Performance
- **Security Headers**: Helmet.js protection with CORS and rate limiting
- **Path Protection**: Prevention of directory traversal attacks
- **File Validation**: Secure file upload with size limits (10MB)
- **Responsive Design**: Works on desktop and mobile devices

### Multi-Client Ecosystem
- **Web Application**: React-based browser client with full functionality
- **Desktop Application**: Electron-based native desktop app for Windows, macOS, and Linux
- **Browser Extensions**: Chrome and Edge extensions for quick documentation search
- **Template System**: JSON-based content templates for meeting notes and daily feedback

### Additional Services
- **Filing Service**: Multi-provider file storage (Local, FTP, AWS S3)
- **DataServe Service**: Database operations and data management
- **Caching Service**: Multi-provider caching (In-memory, Redis, Memcached)
- **Authentication**: Passport.js with local authentication and session management
- **Workflow Engine**: Step-based workflow processing with error handling

## Tech Stack

### Backend
- Node.js with Express.js
- Simple-git for Git operations
- Security middleware (Helmet, CORS, Rate limiting)
- Passport.js for authentication
- JWT for token-based auth
- Multer for file uploads
- AWS SDK for S3 integration
- Redis and Memcached for caching

### Frontend
- React 18 with React DOM
- React Markdown with syntax highlighting
- Glassmorphism CSS styling
- Axios for API calls
- React Toastify for notifications
- Context API for state management

### Desktop & Extensions
- **Electron**: Cross-platform desktop application
- **Browser Extensions**: Manifest V3 compatible extensions
- **Extension Features**: Popup interface, content scripts, background service workers

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git repository initialized

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd dt-architecture-artifacts
```

2. Install dependencies
```bash
npm run install-deps
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Start the development server
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend development server on `http://localhost:3000`

## Project Structure

```
dt-architecture-artifacts/
├── server/                     # Backend Express server
│   ├── index.js               # Main server file
│   ├── src/
│   │   ├── services/          # Microservices architecture
│   │   │   ├── caching/       # Caching service (Redis, Memcached)
│   │   │   ├── searching/     # Search service with JSON storage
│   │   │   ├── logging/       # Logging service
│   │   │   ├── filing/        # File storage (Local, FTP, S3)
│   │   │   ├── dataserve/     # Database operations
│   │   │   ├── queueing/      # Queue management
│   │   │   ├── measuring/     # Metrics and monitoring
│   │   │   ├── notifying/     # Notification service
│   │   │   ├── scheduling/    # Task scheduling
│   │   │   ├── working/       # Worker processes
│   │   │   └── workflow/      # Workflow engine
│   │   ├── auth/              # Authentication & user management
│   │   ├── components/        # Server-side React components
│   │   └── routes/            # API route definitions
│   └── plugins/               # Server plugins (Word to MD converter)
├── client/                    # React web frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── contexts/          # React contexts (Auth, Theme)
│   │   ├── services/          # API services
│   │   └── utils/             # Utility functions
│   └── plugins/               # Client plugins
├── client-electron/           # Electron desktop application
│   ├── main.js               # Electron main process
│   └── src/                  # Same React app as web client
├── client-extensions/         # Browser extensions
│   ├── google/               # Chrome extension
│   └── edge/                 # Edge extension
├── content/                  # Markdown files storage
├── content-templates/        # JSON templates for content
├── tests/                    # Comprehensive test suite
│   ├── server/services/      # Service-specific tests
│   └── mocks/                # Test mocks and fixtures
├── tests-api/                # HTTP API tests
├── tests-load/               # Load testing framework
└── package.json              # Root dependencies
```

## API Endpoints

### Core File Operations
- `GET /api/files` - Get file tree structure
- `GET /api/files/*` - Get specific file content
- `POST /api/files/*` - Save file content
- `DELETE /api/files/*` - Delete files
- `POST /api/upload` - Upload files (multipart/form-data)
- `GET /api/download/*` - Download files

### Git Integration
- `POST /api/commit` - Commit changes to Git
- `POST /api/push` - Push changes to remote repository
- `POST /api/pull` - Pull changes from remote repository
- `POST /api/clone` - Clone repository
- `GET /api/status` - Get Git repository status

### Microservices API
- `GET /api/{service}/status` - Get service health status
- `POST /api/searching/add` - Add JSON data to search service
- `GET /api/searching/search/:term` - Search stored data
- `DELETE /api/searching/delete/:key` - Delete data by key
- `POST /api/caching/set` - Set cache value
- `GET /api/caching/get/:key` - Get cache value
- `POST /api/logging/log` - Create log entry
- `GET /api/logging/logs` - Retrieve logs

### Monitoring & Management
- `GET /api-monitor` - API monitoring dashboard
- `GET /monitoring/api` - API call statistics
- `GET /services/{service}` - Service management UI

## Usage

1. **File Navigation**: Use the left sidebar to browse and select markdown files
2. **Editing**: Click on a file to open it in the editor
3. **Preview**: Use the Preview tab to see rendered markdown
4. **Split View**: Use Split View to edit and preview simultaneously
5. **Saving**: Click Save to save changes to the file system
6. **Committing**: Click "Commit & Push" to commit changes with a message and push to the remote repository

## Glassmorphism Design

The application features a modern glassmorphism design with:
- Translucent backgrounds with blur effects
- Subtle borders and shadows
- Gradient backgrounds
- Smooth transitions and animations
- Responsive layout

## Security Features

- Helmet.js for security headers
- CORS protection
- Rate limiting
- Path traversal protection
- Input validation

## Development

### Scripts
- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start backend server only
- `npm run client` - Start frontend only (from client directory)
- `npm run electron` - Start desktop application with server
- `npm run build` - Build frontend for production
- `npm run install-deps` - Install all dependencies (root, client, electron)
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:client` - Run client-side tests only
- `npm run test:server` - Run server-side tests only

### Testing & Quality Assurance
The project includes comprehensive testing at multiple levels:
- **Unit Tests**: Jest-based testing for all services and components
- **Integration Tests**: API endpoint testing with SuperTest
- **Load Tests**: Performance testing for all microservices
- **Coverage**: 70% minimum coverage threshold across all metrics
- **API Tests**: HTTP-based testing with dedicated .http files

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (ensure all tests pass and coverage is maintained)
5. Update documentation if needed
6. Submit a pull request

### Development Environment Setup
1. **Prerequisites**: Node.js v14+, npm, Git
2. **Installation**: Run `npm run install-deps` to install all dependencies
3. **Development**: Use `npm run dev` for full development experience
4. **Testing**: Run tests frequently with `npm test` or `npm run test:watch`
5. **Desktop Development**: Use `npm run electron` for desktop app development
6. **Browser Extensions**: Load unpacked extensions from `client-extensions/` directories

## Client Applications

### Web Application
Access the full-featured web interface at `http://localhost:3000` after running `npm run dev`.

### Desktop Application
The Electron-based desktop app provides native OS integration:
- **Windows**: NSIS installer
- **macOS**: DMG package
- **Linux**: AppImage
- **Features**: Native file system access, OS notifications, offline capabilities

### Browser Extensions
Quick access to documentation search from any webpage:
- **Chrome**: Load from `client-extensions/google/`
- **Edge**: Load from `client-extensions/edge/`
- **Features**: Search documentation, preview files, configurable server connection

## Enterprise Features

### Microservices Architecture
The platform includes 11 integrated microservices for enterprise-grade functionality:
1. **Searching**: JSON data storage and text search
2. **Caching**: Multi-provider caching (Redis, Memcached, In-memory)
3. **Logging**: Structured logging with multiple output targets
4. **Filing**: Multi-cloud file storage (Local, FTP, AWS S3)
5. **DataServe**: Database operations and data management
6. **Queueing**: Message queue management
7. **Measuring**: Metrics collection and monitoring
8. **Notifying**: Multi-channel notification system
9. **Scheduling**: Cron-based task scheduling
10. **Working**: Background worker processes
11. **Workflow**: Step-based workflow engine

### Monitoring & Analytics
- **API Monitoring**: Real-time API call tracking and performance metrics
- **Service Health**: Live status monitoring for all microservices
- **Load Testing**: Built-in performance testing framework
- **Error Tracking**: Comprehensive error logging and alerting

## License

ISC License

## Support

For issues and questions, please create an issue in the repository. For enterprise support and custom implementations, contact the development team.

<!-- METADATA_DATA_START
{
  "recentEdits": [],
  "starred": true,
  "version": "1.0",
  "createdAt": "2025-07-31T09:43:51.783Z",
  "lastUpdated": "2025-07-31T09:43:51.783Z",
  "starredAt": "2025-07-31T09:43:51.783Z"
}
METADATA_DATA_END -->