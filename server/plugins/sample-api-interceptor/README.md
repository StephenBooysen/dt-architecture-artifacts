# Sample API Interceptor Plugin

This is a sample plugin that demonstrates how to create plugins for the Architecture Artifacts platform. It intercepts API calls on both client and server environments.

## Features

- **Request Interception**: Logs incoming requests and adds timestamps
- **Response Modification**: Adds processing metadata to responses
- **Sensitive Data Filtering**: Automatically filters sensitive fields like passwords and tokens
- **Configurable Options**: Customize behavior through plugin options

## Installation

The plugin dependencies are automatically installed when the plugin is loaded.

```bash
cd server/plugins/sample-api-interceptor
npm install
```

## Usage

### Server-side Usage

```javascript
// Load the plugin
const plugin = require('./plugins/sample-api-interceptor');

// Create an instance with options
const interceptor = plugin.create({
  logRequests: true,
  addTimestamp: true,
  filterSensitiveData: true
});

// Use as middleware
app.use('/api', interceptor.middleware);

// Use response handler
app.use('/api', (req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    const processedData = interceptor.responseHandler(req, res, data);
    originalSend.call(this, processedData);
  };
  next();
});
```

### Entry Points

#### `plugin.files.intercept`
Direct middleware function for file-related operations.

#### `plugin.create(options)`
Factory function that creates a configured plugin instance with:
- `middleware`: Express middleware function
- `responseHandler`: Response processing function
- `info()`: Returns plugin information
- `config`: Current plugin configuration

## Configuration Options

- `logRequests` (boolean): Whether to log intercepted requests
- `addTimestamp` (boolean): Whether to add timestamps to requests and responses
- `filterSensitiveData` (boolean): Whether to filter sensitive data fields

## API

### Request Interception
The plugin intercepts incoming requests and can:
- Log request details
- Add metadata to the request object
- Filter sensitive data from request body

### Response Interception
The plugin processes outgoing responses and can:
- Add processing metadata
- Calculate processing time
- Log response details

## Dependencies

- `lodash`: Utility library for data manipulation
- `moment`: Date/time handling library

## Example Response

With the plugin enabled, API responses will include additional metadata:

```json
{
  "data": "your original response data",
  "metadata": {
    "processedAt": "2024-01-15T10:30:00.000Z",
    "processingTime": "150ms"
  }
}
```

## Development

To test the plugin:

```bash
npm test
```

To modify the plugin behavior, edit the configuration options when creating the plugin instance.