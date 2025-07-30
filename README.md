# Architecture Artifacts Editor

A modern markdown editor with glassmorphism theme and microservices management platform. Built for architects, product owners, and business analysts to capture and manage architecture documentation with Git integration and comprehensive service monitoring.

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
- **9 Integrated Services**: Logging, Caching, Queueing, Measuring, Notifying, Scheduling, Searching, Working, and Workflow
- **Service UIs**: Dedicated management interfaces for each microservice
- **Health Monitoring**: Real-time status indicators for all services
- **API Monitoring**: Built-in dashboard for tracking API calls and performance

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

## Tech Stack

### Backend
- Node.js with Express.js
- Simple-git for Git operations
- Security middleware (Helmet, CORS, Rate limiting)

### Frontend
- React 18
- React Markdown with syntax highlighting
- Glassmorphism CSS styling
- Axios for API calls
- React Toastify for notifications

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
├── server/                 # Backend Express server
│   └── index.js           # Main server file
├── client/                # React frontend
│   ├── public/           # Static files
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   ├── App.js        # Main App component
│   │   └── App.css       # Glassmorphism styles
│   └── package.json      # Frontend dependencies
├── content/              # Markdown files storage
└── package.json          # Backend dependencies
```

## API Endpoints

- `GET /api/files` - Get file tree structure
- `GET /api/files/*` - Get specific file content
- `POST /api/files/*` - Save file content
- `POST /api/commit` - Commit changes to Git
- `POST /api/push` - Push changes to remote repository
- `GET /api/status` - Get Git repository status

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
- `npm run client` - Start frontend only
- `npm run build` - Build frontend for production

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License

## Support

For issues and questions, please create an issue in the repository.