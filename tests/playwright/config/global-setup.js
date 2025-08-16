/**
 * Global setup for Playwright tests
 * This runs once before all tests begin
 */

const { chromium } = require('@playwright/test');

async function globalSetup() {
  console.log('🚀 Starting global setup for Playwright tests...');
  
  // Wait for services to be ready
  await waitForServices();
  
  // Create test data if needed
  await setupTestData();
  
  console.log('✅ Global setup completed');
}

async function waitForServices() {
  const maxRetries = 30;
  const retryInterval = 2000;
  
  console.log('⏳ Waiting for server and client to be ready...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check server health
      const serverResponse = await fetch('http://localhost:5000/api/server/health');
      if (!serverResponse.ok) {
        throw new Error('Server not ready');
      }
      
      // Check client health
      const clientResponse = await fetch('http://localhost:3000');
      if (!clientResponse.ok) {
        throw new Error('Client not ready');
      }
      
      console.log('✅ Both server and client are ready');
      return;
    } catch (error) {
      console.log(`⏳ Attempt ${i + 1}/${maxRetries}: Services not ready yet...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  
  throw new Error('❌ Services failed to start within the expected time');
}

async function setupTestData() {
  console.log('📝 Setting up test data...');
  
  // Create a test user for authentication tests
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass123'
      }),
    });
    
    if (response.ok) {
      console.log('✅ Test user created successfully');
    } else {
      console.log('ℹ️  Test user might already exist');
    }
  } catch (error) {
    console.log('⚠️  Could not create test user:', error.message);
  }
}

module.exports = globalSetup;