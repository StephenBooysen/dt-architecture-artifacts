# Sample Architecture Document

## Overview
This is a sample markdown file to demonstrate the architecture artifacts editor.

## Features
- **Glassmorphism UI**: Modern glass-like interface with blur effects
- **Live Preview**: Real-time markdown preview
- **Git Integration**: Commit and push changes directly from the editor
- **File Management**: Browse and edit files from the left sidebarrewrwer

## Code Example
```javascript
const markdownEditor = {
  theme: 'glassmorphism',
  features: ['preview', 'git', 'file-tree'],
  backend: 'node.js',
  frontend: 'react'
};
```

## Tables
| Feature | Status | Priority |
|---------|--------|----------|
| Editor | ✅ Complete | High |
| Preview | ✅ Complete | High |
| Git Integration | ✅ Complete | High |
| File Tree | ✅ Complete | Medium |

## Architecture Components
1. **Frontend (React)**
   - File tree navigation
   - Markdown editor with syntax highlighting
   - Live preview panel
   - Commit modal

2. **Backend (Node.js/Express)**
   - File system API
   - Git operations
   - Security middleware

3. **Storage**
   - Local file system
   - Git repository integration

## Getting Started
1. Install dependencies: `npm run install-deps`
2. Start development server: `npm run dev`
3. Open browser to `http://localhost:3000`

---
*This document was created using the Architecture Artifacts Editor*