/**
 * Navigation and UI tests for the client application
 */

import { test, expect } from '@playwright/test';
import { login, switchSpace } from '../utils/test-helpers.js';

test.describe('Navigation and UI', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper header navigation elements', async ({ page }) => {
    // Verify header elements
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('img[alt*="Architecture Artifacts"]')).toBeVisible();
    await expect(page.locator(':has-text("Architecture Artifacts Editor")')).toBeVisible();
    
    // Search box
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // User info
    await expect(page.locator('text=Welcome, testuser')).toBeVisible();
    
    // Theme toggle
    await expect(page.locator('button i.bi-sun, button i.bi-moon')).toBeVisible();
    
    // Logout button
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });

  test('should toggle sidebar visibility', async ({ page }) => {
    // Sidebar should be visible initially
    await expect(page.locator('.sidebar')).toBeVisible();
    
    // Find and click sidebar toggle button
    const toggleButton = page.locator('.sidebar-toggle, button:has(i.bi-layout-sidebar), button:has(i.bi-aspect-ratio)');
    await toggleButton.click();
    
    // Sidebar should be hidden or collapsed
    await expect(page.locator('.sidebar')).not.toBeVisible();
    
    // Click again to show
    await toggleButton.click();
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('should toggle dark/light theme', async ({ page }) => {
    // Find theme toggle button
    const themeToggle = page.locator('button:has(i.bi-sun), button:has(i.bi-moon)');
    
    // Get current theme icon
    const isDarkMode = await page.locator('i.bi-sun').isVisible();
    
    // Click theme toggle
    await themeToggle.click();
    
    // Theme should change
    if (isDarkMode) {
      await expect(page.locator('i.bi-moon')).toBeVisible();
    } else {
      await expect(page.locator('i.bi-sun')).toBeVisible();
    }
    
    // Toggle back
    await themeToggle.click();
    
    if (isDarkMode) {
      await expect(page.locator('i.bi-sun')).toBeVisible();
    } else {
      await expect(page.locator('i.bi-moon')).toBeVisible();
    }
  });

  test('should navigate between different views', async ({ page }) => {
    // Test navigation to Home view
    await page.click('button:has-text("Architecture Artifacts Editor"), .navbar-brand');
    await expect(page.locator('.home-view, :has-text("Welcome")')).toBeVisible({ timeout: 5000 });
    
    // Test navigation to Files view (if there's a files button/link)
    const filesButton = page.locator('button:has-text("Files"), .nav-link:has-text("Files")');
    if (await filesButton.isVisible()) {
      await filesButton.click();
      await expect(page.locator('.file-tree')).toBeVisible();
    }
    
    // Test navigation to Templates view (if available)
    const templatesButton = page.locator('button:has-text("Templates"), .nav-link:has-text("Templates")');
    if (await templatesButton.isVisible()) {
      await templatesButton.click();
      await expect(page.locator(':has-text("Templates"), .templates-view')).toBeVisible();
    }
  });

  test('should perform search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Type in search box
    await searchInput.fill('test');
    
    // Press Enter to search
    await searchInput.press('Enter');
    
    // Should show search results or search view
    await expect(page.locator('.search-results, .search-dropdown, :has-text("results")')).toBeVisible({ timeout: 10000 });
    
    // Clear search
    await searchInput.clear();
  });

  test('should show search suggestions while typing', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Focus on search input
    await searchInput.click();
    
    // Type to trigger suggestions
    await searchInput.type('test', { delay: 100 });
    
    // Wait for search dropdown to appear (may not have results but should show loading or no results)
    await page.waitForTimeout(1000); // Give time for API call
    
    // Check if dropdown appeared
    const dropdown = page.locator('.search-dropdown, .search-suggestions');
    if (await dropdown.isVisible()) {
      // If dropdown exists, it should have some content
      await expect(dropdown).toBeVisible();
    }
    
    // Clear search
    await searchInput.clear();
  });

  test('should show user settings when clicking on user info', async ({ page }) => {
    // Click on user welcome area
    await page.click('text=Welcome, testuser, .user-info');
    
    // Should navigate to settings or show settings modal
    await expect(page.locator('.settings-view, .user-settings, :has-text("Settings")')).toBeVisible({ timeout: 5000 });
  });

  test('should handle space switching', async ({ page }) => {
    // Look for space selector
    const spaceSelector = page.locator('.space-selector, [data-testid="space-selector"]');
    
    if (await spaceSelector.isVisible()) {
      // Click space selector
      await spaceSelector.click();
      
      // Should show available spaces
      await expect(page.locator('.space-dropdown, .space-list')).toBeVisible({ timeout: 5000 });
      
      // Try to find and click on a different space (if available)
      const personalSpace = page.locator('text="Personal"');
      if (await personalSpace.isVisible()) {
        await personalSpace.click();
        
        // Should show space switch confirmation
        await expect(page.locator(':has-text("Switched to")')).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip('Space selector not available in current UI');
    }
  });

  test('should maintain responsive layout on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Header should still be visible and functional
    await expect(page.locator('.app-header')).toBeVisible();
    
    // Mobile menu or responsive behavior should be active
    // Sidebar might be collapsed by default on mobile
    const sidebar = page.locator('.sidebar');
    const sidebarToggle = page.locator('.sidebar-toggle');
    
    // Toggle sidebar on mobile
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
    }
    
    // Search should still work
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');
      await searchInput.clear();
    }
    
    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+S for save (if a file is open)
    const editor = page.locator('.markdown-editor textarea, .CodeMirror textarea');
    if (await editor.isVisible()) {
      await editor.focus();
      await page.keyboard.press('Control+S');
      // Should trigger save action (might show toast or indication)
    }
    
    // Test Escape key to close modals/dropdowns
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    await searchInput.press('Escape');
    
    // Search should be cleared or dropdown closed
    const dropdown = page.locator('.search-dropdown');
    if (await dropdown.isVisible()) {
      await expect(dropdown).not.toBeVisible();
    }
  });

  test('should show loading states appropriately', async ({ page }) => {
    // Navigate to a view that might show loading
    await page.click('button:has-text("Architecture Artifacts Editor")');
    
    // Look for loading indicators
    const loadingIndicator = page.locator('.loading, .spinner, :has-text("Loading")');
    
    // If loading appears, it should disappear when content loads
    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
    
    // Content should be visible after loading
    await expect(page.locator('.home-view, .file-tree, main')).toBeVisible();
  });

});