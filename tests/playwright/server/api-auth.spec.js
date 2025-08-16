/**
 * API Authentication tests for the server
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000/api';

test.describe('API Authentication', () => {
  
  test('should register a new user', async ({ request }) => {
    const timestamp = Date.now();
    const userData = {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'testpassword123'
    };
    
    const response = await request.post(`${API_BASE}/auth/register`, {
      data: userData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.user).toBeDefined();
    expect(responseData.user.username).toBe(userData.username);
    expect(responseData.user.email).toBe(userData.email);
    expect(responseData.user.password).toBeUndefined(); // Password should not be returned
  });

  test('should not register user with existing email', async ({ request }) => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123'
    };
    
    // Try to register the same user twice
    await request.post(`${API_BASE}/auth/register`, { data: userData });
    
    const response = await request.post(`${API_BASE}/auth/register`, {
      data: userData
    });
    
    expect(response.status()).toBe(400);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.message).toContain('already exists');
  });

  test('should login with valid credentials', async ({ request }) => {
    const loginData = {
      username: 'testuser',
      password: 'testpass123'
    };
    
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: loginData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.user).toBeDefined();
    expect(responseData.user.username).toBe(loginData.username);
    
    // Should set authentication cookie/session
    const cookies = response.headers()['set-cookie'];
    expect(cookies).toBeDefined();
  });

  test('should not login with invalid credentials', async ({ request }) => {
    const loginData = {
      username: 'testuser',
      password: 'wrongpassword'
    };
    
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: loginData
    });
    
    expect(response.status()).toBe(401);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.message).toContain('Invalid');
  });

  test('should not login with missing credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: {
        username: 'testuser'
        // Missing password
      }
    });
    
    expect(response.status()).toBe(400);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
  });

  test('should logout successfully', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        username: 'testuser',
        password: 'testpass123'
      }
    });
    
    expect(loginResponse.status()).toBe(200);
    
    // Now logout
    const response = await request.post(`${API_BASE}/auth/logout`);
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
  });

  test('should validate required fields for registration', async ({ request }) => {
    // Test missing username
    let response = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: 'test@example.com',
        password: 'password123'
      }
    });
    expect(response.status()).toBe(400);
    
    // Test missing email
    response = await request.post(`${API_BASE}/auth/register`, {
      data: {
        username: 'testuser',
        password: 'password123'
      }
    });
    expect(response.status()).toBe(400);
    
    // Test missing password
    response = await request.post(`${API_BASE}/auth/register`, {
      data: {
        username: 'testuser',
        email: 'test@example.com'
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should validate email format', async ({ request }) => {
    const userData = {
      username: 'testuser',
      email: 'invalid-email',
      password: 'password123'
    };
    
    const response = await request.post(`${API_BASE}/auth/register`, {
      data: userData
    });
    
    expect(response.status()).toBe(400);
    const responseData = await response.json();
    expect(responseData.message).toMatch(/email|invalid/i);
  });

  test('should validate password strength', async ({ request }) => {
    const userData = {
      username: 'testuser123',
      email: 'test123@example.com',
      password: '123' // Too short
    };
    
    const response = await request.post(`${API_BASE}/auth/register`, {
      data: userData
    });
    
    expect(response.status()).toBe(400);
    const responseData = await response.json();
    expect(responseData.message).toMatch(/password|weak|short/i);
  });

  test('should return user profile for authenticated user', async ({ request }) => {
    // First login
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        username: 'testuser',
        password: 'testpass123'
      }
    });
    
    expect(loginResponse.status()).toBe(200);
    
    // Get user profile
    const response = await request.get(`${API_BASE}/auth/profile`);
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.user).toBeDefined();
    expect(responseData.user.username).toBe('testuser');
    expect(responseData.user.password).toBeUndefined();
  });

  test('should not return user profile for unauthenticated user', async ({ request }) => {
    const response = await request.get(`${API_BASE}/auth/profile`);
    
    expect(response.status()).toBe(401);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
  });

});