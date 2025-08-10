# Architecture Artifacts Browser Extensions

Browser extensions for Chrome and Edge that provide quick search access to your Design Artifacts server. documentation.

## Features

- **Quick Search**: Search through your documentation from any webpage
- **Real-time Results**: Get instant search results as you type
- **Content & File Search**: Search both file names and content
- **Markdown Preview**: View full markdown files with formatted preview
- **Configurable Server**: Connect to your local or remote Design Artifacts server.

## Installation

### Chrome Extension
1. Go to `chrome://extensions/`
2. Enable "Developer mode" 
3. Click "Load unpacked" and select `/extensions/google/`

### Edge Extension  
1. Go to `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select `/extensions/edge/`

## Usage

1. Click the extension icon in your browser toolbar
2. Configure server URL in settings (default: `http://localhost:5000`)
3. Search your documentation and click results to preview

## Requirements

- Design Artifacts server. running with search API endpoints
- CORS configured to allow browser extension requests