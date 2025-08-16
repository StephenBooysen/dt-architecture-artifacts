/**
 * Authentication tests for the client application
 */

import { test, expect } from '@playwright/test';
import { login, logout, getToastMessage } from '../utils/test-helpers.js';

test.describe('Authentication', () => {
  
  test('should display welcome screen on first visit', async ({ page }) => {
    await page.goto('/');
    
    // Should show landing page initially
    await expect(page.locator('h1:has-text("Architecture Artifacts")')).toBeVisible();
    await expect(page.locator('text=Modern documentation workspace for architecture teams')).toBeVisible();
    
    // Wait for transition to auth options
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible({ timeout: 10000 });
  });

  test('should show login modal when clicking Sign In', async ({ page }) => {
    await page.goto('/');
    
    // Wait for and click Sign In button
    await page.waitForSelector('button:has-text("Sign In")');
    await page.click('button:has-text("Sign In")');
    
    // Verify login modal appears
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show registration modal when clicking Create Account', async ({ page }) => {
    await page.goto('/');
    
    // Wait for and click Create Account button
    await page.waitForSelector('button:has-text("Create Account")');
    await page.click('button:has-text("Create Account")');
    
    // Verify registration modal appears
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await login(page);
    
    // Verify successful login
    await expect(page.locator('text=Welcome, testuser')).toBeVisible();
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    
    // Verify main application UI is visible
    await expect(page.locator('.file-tree, .sidebar')).toBeVisible();
    await expect(page.locator('.app-header')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Click Sign In
    await page.waitForSelector('button:has-text("Sign In")');
    await page.click('button:has-text("Sign In")');
    
    // Fill invalid credentials
    await page.fill('input[name="username"]', 'invaliduser');
    await page.fill('input[name="password"]', 'invalidpass');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify error message appears
    await expect(page.locator('.text-danger, .alert-danger, :has-text("Invalid")')).toBeVisible({ timeout: 5000 });
  });

  test('should successfully logout', async ({ page }) => {
    await login(page);
    
    // Logout
    await logout(page);
    
    // Verify logout successful - back to auth screen
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('text=Welcome, testuser')).not.toBeVisible();
  });

  test('should switch between login and registration modals', async ({ page }) => {
    await page.goto('/');
    
    // Open login modal
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('input[name="username"]')).toBeVisible();
    
    // Switch to registration
    await page.click('text=Create Account, text=Register, button:has-text("Register")');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    
    // Switch back to login
    await page.click('text=Sign In, text=Login, button:has-text("Login")');
    await expect(page.locator('input[name="email"]')).not.toBeVisible();
  });

  test('should require username and password for login', async ({ page }) => {
    await page.goto('/');
    
    // Open login modal
    await page.click('button:has-text("Sign In")');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation (HTML5 validation or custom validation)
    const usernameField = page.locator('input[name="username"]');
    const passwordField = page.locator('input[name="password"]');
    
    // Either HTML5 validation kicks in or custom validation shows
    const usernameInvalid = await usernameField.evaluate(el => !el.checkValidity());
    const passwordInvalid = await passwordField.evaluate(el => !el.checkValidity());
    
    expect(usernameInvalid || passwordInvalid).toBeTruthy();
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    await login(page);
    
    // Reload the page
    await page.reload();
    
    // Should still be authenticated
    await expect(page.locator('text=Welcome, testuser')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.file-tree, .sidebar')).toBeVisible();
  });

});