# Architecture Artifacts VS Code Extension

Search and preview architecture documentation from your Architecture Artifacts server directly in VS Code.

## Features

🔍 **Smart Search** - Search through documentation content and file names with real-time results

📖 **Markdown Preview** - Preview markdown files with proper syntax highlighting and VS Code theme integration

🔐 **Secure Authentication** - Login securely to your Architecture Artifacts server with session management

⚙️ **Configurable Settings** - Customize server URL and authentication preferences

🎨 **VS Code Integration** - Seamlessly integrates with VS Code's native UI and theming

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Architecture Artifacts"
4. Click Install

## Setup

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run "Architecture Artifacts: Settings"
3. Configure your server URL (default: http://localhost:5000)
4. Sign in using "Architecture Artifacts: Sign In"

## Usage

### Searching Documentation

1. **Via Command Palette**: 
   - Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
   - Run "Architecture Artifacts: Search Documentation"

2. **Via Activity Bar**:
   - Click the Architecture Artifacts icon in the Activity Bar
   - Click the search icon in the panel

3. **Search Types**:
   - **Content Search**: Search within file content
   - **File Search**: Search by file names

### Viewing Results

- Click on any search result to preview the file
- Use the back button to return to search results
- Search terms are highlighted in results and previews

### Authentication

- **Sign In**: Use the Command Palette or Activity Bar
- **Sign Out**: Click your username in the Activity Bar or use Command Palette
- **Auto Login**: Enable in settings to automatically check authentication on startup

### Settings

Access settings through:
- Command Palette: "Architecture Artifacts: Settings"
- Activity Bar: Click the settings icon

Available settings:
- **Server URL**: Your Architecture Artifacts server endpoint
- **Auto Login**: Automatically check authentication on startup
- **Test Connection**: Verify server connectivity

## Commands

All commands are available through the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- `Architecture Artifacts: Search Documentation` - Open search interface
- `Architecture Artifacts: Sign In` - Authenticate with server
- `Architecture Artifacts: Sign Out` - Sign out and clear session
- `Architecture Artifacts: Settings` - Configure extension settings

## Activity Bar Integration

The extension adds an Architecture Artifacts panel to the Activity Bar with:

- **Authentication Status** - Shows current login state
- **Quick Search Access** - One-click search functionality
- **Settings Access** - Easy configuration management

## Requirements

- VS Code version 1.74.0 or higher
- Architecture Artifacts server running and accessible
- Valid user account on the Architecture Artifacts server

## Extension Settings

This extension contributes the following settings:

- `architectureArtifacts.serverUrl`: Architecture Artifacts server URL (default: "http://localhost:5000")
- `architectureArtifacts.autoLogin`: Automatically check authentication status on startup (default: false)

## Security

- Authentication uses secure session cookies
- Credentials are stored securely using VS Code's Secret Storage API
- All server communication uses HTTPS when available
- Session data is cleared on logout

## Troubleshooting

### Connection Issues

1. **Verify Server URL**: Check that your server URL is correct in settings
2. **Server Status**: Ensure your Architecture Artifacts server is running
3. **Network Access**: Verify network connectivity to the server
4. **Test Connection**: Use the "Test Connection" option in settings

### Authentication Issues

1. **Clear Session**: Sign out and sign in again
2. **Server Logs**: Check Architecture Artifacts server logs for authentication errors
3. **Credentials**: Verify your username and password are correct

### Search Issues

1. **Authentication**: Ensure you're signed in to the server
2. **Permissions**: Verify your account has access to the documentation
3. **Server Response**: Check if the server is responding to search requests

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Architecture Artifacts server logs
3. Create an issue in the Architecture Artifacts repository

## Release Notes

### 1.0.0

Initial release of Architecture Artifacts VS Code Extension

- Full-featured search functionality
- Secure authentication system
- Markdown preview with syntax highlighting
- VS Code theme integration
- Activity Bar integration
- Comprehensive settings management

## Development

### Building the Extension

```bash
npm install
npm run compile
```

### Running in Development

1. Open this folder in VS Code
2. Press F5 to launch a new Extension Development Host window
3. Test the extension functionality

### Packaging

```bash
npm install -g vsce
vsce package
```

## License

This extension is part of the Architecture Artifacts project and follows the same license terms.