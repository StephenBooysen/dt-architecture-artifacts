# Architecture Artifacts Server Watcher

A file synchronization tool that watches local directories and automatically syncs changes to your personal space in the Architecture Artifacts server.

## Features

- **Real-time file watching** - Automatically detects and syncs file changes
- **API key authentication** - Secure authentication using server-generated API keys  
- **Configurable sync paths** - Sync to specific directories in your personal space
- **Dry run mode** - Test sync operations without making actual changes
- **Text file filtering** - Only syncs relevant text/code files
- **Batch operations** - Efficiently batches multiple file changes
- **CLI interface** - Easy-to-use command line interface

## Installation

1. Navigate to the server-watcher directory:
```bash
cd server-watcher
```

2. Install dependencies:
```bash
npm install
```

3. Make the CLI executable (optional):
```bash
npm link
```

## Quick Start

1. **Generate an API key**:
   - Log into the Architecture Artifacts web interface
   - Go to User Settings
   - Generate a new API key for "Server Watcher"
   - Copy the API key (you'll only see it once)

2. **Create a configuration file**:
```bash
node src/index.js config --create
```

3. **Edit the configuration file** (`watcher.config.json`):
```json
{
  "serverUrl": "http://localhost:3001",
  "apiKey": "ak_your_generated_api_key_here",
  "username": "your_username",
  "localPath": "./my-sync-folder",
  "remotePath": "synced-files",
  "verbose": false,
  "dryRun": false
}
```

4. **Test the configuration**:
```bash
node src/index.js test
```

5. **Start watching for changes**:
```bash
node src/index.js watch
```

## Commands

### `watch`
Start real-time file watching and synchronization:

```bash
node src/index.js watch [options]
```

Options:
- `-c, --config <file>` - Configuration file path
- `-s, --server <url>` - Server URL
- `-k, --api-key <key>` - API key for authentication
- `-u, --username <username>` - Username for personal space
- `-l, --local-path <path>` - Local directory to watch
- `-r, --remote-path <path>` - Remote directory path
- `-v, --verbose` - Enable verbose logging
- `-d, --dry-run` - Dry run mode (no actual changes)

### `sync`
Perform one-time directory synchronization:

```bash
node src/index.js sync [options]
```

Same options as `watch` command.

### `test`
Test connection and configuration:

```bash
node src/index.js test [options]
```

### `config`
Manage configuration files:

```bash
# Create sample configuration
node src/index.js config --create [filename]

# View current configuration
node src/index.js config --view [filename]

# Save configuration
node src/index.js config --save [filename]
```

## Configuration

### Configuration Sources
The application loads configuration from multiple sources in this order:
1. Default values
2. `.env` files
3. Configuration file (JSON)
4. Environment variables
5. Command line arguments

### Configuration File Format
```json
{
  "serverUrl": "http://localhost:3001",
  "apiKey": "ak_your_api_key_here",
  "username": "your_username",
  "localPath": "./sync-folder",
  "remotePath": "synced-files",
  "watchOptions": {
    "ignoreInitial": false,
    "ignored": [
      "**/node_modules/**",
      "**/.git/**",
      "**/.DS_Store",
      "**/Thumbs.db",
      "**/*.tmp",
      "**/*.temp",
      "**/.*"
    ]
  },
  "verbose": false,
  "dryRun": false
}
```

### Environment Variables
You can also use environment variables:
- `WATCHER_SERVER_URL` - Server URL
- `WATCHER_API_KEY` - API key
- `WATCHER_USERNAME` - Username
- `WATCHER_LOCAL_PATH` - Local directory path
- `WATCHER_REMOTE_PATH` - Remote directory path
- `WATCHER_VERBOSE` - Enable verbose logging (true/false)
- `WATCHER_DRY_RUN` - Enable dry run mode (true/false)

## File Types

The watcher automatically syncs these file types:
- Markdown (`.md`, `.markdown`)
- Code files (`.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.java`, etc.)
- Configuration files (`.json`, `.yml`, `.yaml`, `.xml`)
- Text files (`.txt`, `.csv`, `.log`)
- Stylesheets (`.css`, `.scss`)
- Shell scripts (`.sh`, `.bat`, `.ps1`)

## Usage Examples

### Basic watching
```bash
node src/index.js watch --server http://localhost:3001 --api-key ak_your_key --username john --local-path ./docs
```

### Dry run sync
```bash
node src/index.js sync --config my-config.json --dry-run --verbose
```

### Watch with custom remote path
```bash
node src/index.js watch --local-path ./project --remote-path "projects/my-project"
```

## Troubleshooting

### Connection Issues
- Verify server URL is correct and server is running
- Check firewall settings
- Test with `node src/index.js test`

### Authentication Issues  
- Verify API key is correct and active
- Check username matches your server account
- API keys must start with `ak_`

### File Sync Issues
- Check file permissions
- Verify local path exists
- Check server logs for errors
- Use `--verbose` flag for detailed logging

### Common Error Messages

**"Authentication required"**
- API key is invalid or expired
- Generate a new API key in user settings

**"Local path does not exist"**
- Specified local directory doesn't exist
- Create the directory or update the path

**"Failed to connect to server"**
- Server is not running or unreachable
- Check server URL and network connectivity

## Development and Debugging

### Enable verbose logging
```bash
node src/index.js watch --verbose
```

### Test mode (dry run)
```bash
node src/index.js sync --dry-run --verbose
```

### Check configuration
```bash
node src/index.js config --view
```

## Security Notes

- API keys are sensitive - never commit them to version control
- Use environment variables or secure config files for production
- API keys have the same permissions as your user account
- Revoke unused API keys from the web interface

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Test with verbose logging enabled
4. Create an issue in the project repository