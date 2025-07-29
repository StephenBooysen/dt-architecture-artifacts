# Architecture Artifacts - Electron Desktop Application

This is the desktop version of the Architecture Artifacts Editor built with Electron.

## Features

- Native desktop application experience
- Full functionality of the web client
- Integrated with the Architecture Artifacts server
- Cross-platform support (Windows, macOS, Linux)

## Development

### Prerequisites

- Node.js and npm installed
- Architecture Artifacts server running

### Running in Development Mode

From the root directory of the project:

```bash
# Install all dependencies (including Electron)
npm run install-deps

# Start both server and Electron app
npm run electron
```

This will:
1. Start the Architecture Artifacts server on port 5000
2. Start the React development server on port 3000  
3. Launch the Electron app that connects to the React dev server

### Building for Production

To build the Electron app for production:

```bash
cd client-electron

# Build the React app
npm run build

# Build Electron application
npm run build-electron

# Create distributable packages
npm run dist
```

### Available Scripts

In the `client-electron` directory:

- `npm start` - Start React development server
- `npm run build` - Build React app for production
- `npm run electron` - Run Electron in development mode (requires React dev server)
- `npm run electron-dev` - Run both React dev server and Electron
- `npm run build-electron` - Build Electron app with electron-builder
- `npm run dist` - Create distributable packages

## Architecture

- **main.js** - Electron main process, creates and manages the application window
- **src/** - React application source code (same as web client)  
- **public/** - Static assets including favicon
- **build/** - Production build output (created after `npm run build`)

## Security

The Electron app includes several security features:

- Node integration disabled
- Context isolation enabled
- Web security enabled
- External link handling (opens in default browser)
- Navigation protection

## Platform Support

The app can be built for:

- **Windows** - NSIS installer
- **macOS** - DMG package  
- **Linux** - AppImage

## Configuration

The app connects to the Architecture Artifacts server at `http://localhost:5000` by default. This can be configured through environment variables if needed.