#!/usr/bin/env node

/**
 * @fileoverview Test script for Personal Space Monitoring System
 * Tests the complete workflow from file changes to cache updates
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Test configuration
const TEST_USER = 'testuser';
const TEST_CONTENT_PATH = path.join(__dirname, '../content', TEST_USER);
const TEST_FILE_PATH = path.join(TEST_CONTENT_PATH, 'markdown', 'test-monitoring.md');
const BASE_URL = 'http://localhost:3001/api';

// Test data
const TEST_FILE_CONTENT = `# Test File for Monitoring

This is a test file created at ${new Date().toISOString()}.

## Testing Cache and Search

- File monitoring should detect this file
- Content should be indexed for search
- APIs should return cached responses

*Last updated: ${Date.now()}*
`;

/**
 * Wait for a specified amount of time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if services are running
 */
async function checkServices() {
  console.log('🔍 Checking required services...');
  
  const services = [
    { name: 'Queue', url: `${BASE_URL}/queueing/status` },
    { name: 'Cache', url: `${BASE_URL}/caching/status` },
    { name: 'Search', url: `${BASE_URL}/searching/status` }
  ];
  
  for (const service of services) {
    try {
      const response = await axios.get(service.url);
      if (response.status === 200) {
        console.log(`✅ ${service.name} service is running`);
      } else {
        console.log(`⚠️  ${service.name} service returned status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${service.name} service is not available: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Check queue sizes
 */
async function checkQueueSizes() {
  console.log('\n📊 Queue status:');
  
  const queues = [
    'file-events',
    'cache-updates-high',
    'cache-updates-medium', 
    'cache-updates-low',
    'content-processing-high',
    'content-processing-medium',
    'content-processing-low',
    'search-indexing-high',
    'search-indexing-medium',
    'search-indexing-low'
  ];
  
  for (const queue of queues) {
    try {
      const response = await axios.get(`${BASE_URL}/queueing/size/${queue}`);
      const size = response.data;
      if (size > 0) {
        console.log(`  ${queue}: ${size} items`);
      }
    } catch (error) {
      // Queue might not exist yet, skip
    }
  }
}

/**
 * Test cache access
 */
async function testCacheAccess(cacheKey) {
  try {
    const response = await axios.get(`${BASE_URL}/caching/get/${encodeURIComponent(cacheKey)}`);
    if (response.status === 200 && response.data) {
      console.log(`✅ Cache hit for: ${cacheKey}`);
      return response.data;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`❌ Cache miss for: ${cacheKey}`);
    } else {
      console.log(`⚠️  Cache error for ${cacheKey}: ${error.message}`);
    }
  }
  return null;
}

/**
 * Test search functionality
 */
async function testSearch(searchTerm) {
  try {
    const searchKey = `personal:${TEST_USER}:markdown/test-monitoring.md`;
    console.log(`\n🔍 Testing search for key: ${searchKey}`);
    
    // Note: This would need the actual search API endpoint
    // For now, just test that search service is responding
    const response = await axios.get(`${BASE_URL}/searching/status`);
    if (response.status === 200) {
      console.log(`✅ Search service is responding`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Search test failed: ${error.message}`);
  }
  return false;
}

/**
 * Create test file and monitor the system
 */
async function runMonitoringTest() {
  try {
    console.log('🧪 Starting Personal Space Monitoring Test');
    console.log('===========================================\n');
    
    // Check services
    const servicesReady = await checkServices();
    if (!servicesReady) {
      console.log('\n❌ Required services are not running. Please start the server first.');
      process.exit(1);
    }
    
    // Create test directory structure
    console.log('\n📁 Setting up test environment...');
    await fs.mkdir(path.join(TEST_CONTENT_PATH, 'markdown'), { recursive: true });
    console.log(`✅ Created directory: ${TEST_CONTENT_PATH}/markdown`);
    
    // Check initial queue state
    await checkQueueSizes();
    
    // Create test file
    console.log('\n📝 Creating test file...');
    await fs.writeFile(TEST_FILE_PATH, TEST_FILE_CONTENT);
    console.log(`✅ Created file: ${TEST_FILE_PATH}`);
    
    // Wait for file watcher to detect the change
    console.log('\n⏳ Waiting for file system watcher to detect changes...');
    await sleep(3000);
    
    // Check queue activity
    console.log('\n📊 Checking queue activity after file creation:');
    await checkQueueSizes();
    
    // Wait for processors to handle the queued events
    console.log('\n⏳ Waiting for processors to handle events...');
    await sleep(5000);
    
    // Test cache functionality
    console.log('\n🗄️  Testing cache functionality...');
    const contentCacheKey = `personal:${TEST_USER}:content:markdown/test-monitoring.md`;
    const metaCacheKey = `personal:${TEST_USER}:meta:markdown/test-monitoring.md`;
    const treeCacheKey = `personal:${TEST_USER}:tree`;
    
    await testCacheAccess(contentCacheKey);
    await testCacheAccess(metaCacheKey);
    await testCacheAccess(treeCacheKey);
    
    // Test search functionality
    await testSearch('monitoring');
    
    // Update the file to test change detection
    console.log('\n📝 Updating test file to test change detection...');
    const updatedContent = TEST_FILE_CONTENT + '\n\n## Updated Section\n\nFile updated at: ' + new Date().toISOString();
    await fs.writeFile(TEST_FILE_PATH, updatedContent);
    console.log('✅ File updated');
    
    // Wait and check again
    await sleep(3000);
    console.log('\n📊 Checking queue activity after file update:');
    await checkQueueSizes();
    
    // Wait for processing
    await sleep(5000);
    
    // Final queue check
    console.log('\n📊 Final queue status:');
    await checkQueueSizes();
    
    console.log('\n🎉 Monitoring test completed!');
    console.log('\nWhat to check next:');
    console.log('1. Check server logs for processing activity');
    console.log('2. Test the Personal space APIs with cache-first responses');
    console.log('3. Verify search functionality works');
    console.log('4. Monitor system under load');
    
    console.log('\nCleanup:');
    console.log(`- Test file created: ${TEST_FILE_PATH}`);
    console.log('- You can delete this file to test deletion monitoring');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

/**
 * Cleanup test environment
 */
async function cleanup() {
  try {
    console.log('\n🧹 Cleaning up test environment...');
    await fs.unlink(TEST_FILE_PATH);
    console.log('✅ Deleted test file');
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Test interrupted by user');
  await cleanup();
  process.exit(0);
});

// Run the test
if (require.main === module) {
  runMonitoringTest().catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}