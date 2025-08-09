#!/usr/bin/env node

const plugin = require('./index.js');

console.log('🔌 Plugin Demo - Architecture Artifacts Platform');
console.log('================================================\n');

// Show plugin information
console.log('1. Plugin Information:');
console.log(`   Name: ${plugin.name}`);
console.log(`   Version: ${plugin.version}`);
console.log(`   Has files.intercept: ${!!plugin.files?.intercept}`);
console.log(`   Has create method: ${typeof plugin.create === 'function'}`);
console.log();

// Demonstrate plugin.create() functionality
console.log('2. Creating Plugin Instance:');
const instance = plugin.create({
  logRequests: true,
  addTimestamp: true,
  filterSensitiveData: true
});

console.log('   Plugin instance created with configuration:');
console.log('   -', JSON.stringify(instance.config, null, 4));
console.log();

// Show plugin info
console.log('3. Plugin Instance Info:');
const info = instance.info();
console.log('   -', JSON.stringify(info, null, 4));
console.log();

// Demonstrate response processing
console.log('4. Response Processing Demo:');

// Mock request and response objects
const mockRequest = {
  method: 'POST',
  url: '/api/files',
  pluginData: {
    requestTime: new Date().toISOString()
  }
};

const mockResponse = {};

// Mock data with sensitive information
const mockResponseData = {
  files: [
    { id: 1, name: 'document1.md' },
    { id: 2, name: 'document2.md' }
  ],
  user: {
    username: 'testuser',
    password: 'secret123',  // This should be filtered
    token: 'abc123xyz',     // This should be filtered
    email: 'user@example.com'
  }
};

console.log('   Original response data:');
console.log('   -', JSON.stringify(mockResponseData, null, 4));

const processedData = instance.responseHandler(mockRequest, mockResponse, mockResponseData);

console.log('\n   Processed response data (note metadata and filtered sensitive fields):');
console.log('   -', JSON.stringify(processedData, null, 4));

console.log('\n5. Plugin Entry Points:');
console.log('   - plugin.files.intercept: Available for direct file interception');
console.log('   - plugin.create(): Factory function for configured instances');
console.log('   - instance.middleware: Express middleware for request interception');
console.log('   - instance.responseHandler: Function for response processing');

console.log('\n✅ Plugin demo completed successfully!');
console.log('   The plugin can now be used in the server to intercept API calls.');