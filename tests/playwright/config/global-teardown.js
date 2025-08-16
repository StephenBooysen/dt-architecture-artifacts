/**
 * Global teardown for Playwright tests
 * This runs once after all tests complete
 */

async function globalTeardown() {
  console.log('🧹 Starting global teardown for Playwright tests...');
  
  // Clean up test data
  await cleanupTestData();
  
  console.log('✅ Global teardown completed');
}

async function cleanupTestData() {
  console.log('🗑️  Cleaning up test data...');
  
  // Clean up any test files or data created during tests
  try {
    // You could add cleanup logic here if needed
    // For now, we'll just log that cleanup is complete
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.log('⚠️  Error during cleanup:', error.message);
  }
}

module.exports = globalTeardown;