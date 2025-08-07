/**
 * Test helper utilities for Playwright tests
 */

/**
 * Login helper function
 * @param {Page} page - Playwright page object
 * @param {string} username - Username to login with
 * @param {string} password - Password to login with
 */
export async function login(page, username = 'testuser', password = 'testpass123') {
  await page.goto('/');
  
  // Wait for login modal or button
  await page.waitForSelector('[data-testid="login-button"], .btn:has-text("Sign In")', { timeout: 10000 });
  
  // Click login button if not already on login modal
  const loginButton = page.locator('.btn:has-text("Sign In")');
  if (await loginButton.isVisible()) {
    await loginButton.click();
  }
  
  // Fill in login form
  await page.waitForSelector('input[name="username"]');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for successful login (user welcome message)
  await page.waitForSelector(':has-text("Welcome, testuser")', { timeout: 10000 });
}

/**
 * Logout helper function
 * @param {Page} page - Playwright page object
 */
export async function logout(page) {
  // Click logout button
  await page.click('button:has-text("Logout"), .btn:has(i.bi-box-arrow-right)');
  
  // Wait for login screen
  await page.waitForSelector('.btn:has-text("Sign In")', { timeout: 5000 });
}

/**
 * Create a test file
 * @param {Page} page - Playwright page object
 * @param {string} fileName - Name of the file to create
 * @param {string} content - Content of the file
 */
export async function createTestFile(page, fileName, content = '# Test File\n\nThis is a test file.') {
  // Right-click in file tree to open context menu
  await page.click('.file-tree', { button: 'right' });
  
  // Click "New File" option
  await page.click('text="New File"');
  
  // Enter file name
  await page.fill('input[placeholder*="file name"]', fileName);
  await page.press('input[placeholder*="file name"]', 'Enter');
  
  // Wait for editor to load
  await page.waitForSelector('.markdown-editor', { timeout: 5000 });
  
  // Add content if provided
  if (content) {
    await page.fill('.markdown-editor textarea, .CodeMirror textarea', content);
    
    // Save the file
    await page.keyboard.press('Control+S');
    
    // Wait for save confirmation
    await page.waitForSelector('.toast-success, :has-text("saved successfully")', { timeout: 5000 });
  }
}

/**
 * Delete a test file
 * @param {Page} page - Playwright page object
 * @param {string} fileName - Name of the file to delete
 */
export async function deleteTestFile(page, fileName) {
  // Find the file in the tree
  const fileItem = page.locator(`.file-tree :has-text("${fileName}")`);
  
  // Right-click on the file
  await fileItem.click({ button: 'right' });
  
  // Click delete option
  await page.click('text="Delete"');
  
  // Confirm deletion
  await page.click('button:has-text("Confirm"), button:has-text("Delete")');
  
  // Wait for deletion confirmation
  await page.waitForSelector('.toast-success, :has-text("deleted successfully")', { timeout: 5000 });
}

/**
 * Wait for API response
 * @param {Page} page - Playwright page object
 * @param {string} urlPattern - URL pattern to wait for
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForApiResponse(page, urlPattern, timeout = 10000) {
  return page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() === 200,
    { timeout }
  );
}

/**
 * Get toast message text
 * @param {Page} page - Playwright page object
 * @returns {Promise<string>} Toast message text
 */
export async function getToastMessage(page) {
  const toastSelector = '.toast-success, .toast-error, .toast-info, .toast-warning';
  await page.waitForSelector(toastSelector, { timeout: 5000 });
  return await page.textContent(toastSelector);
}

/**
 * Switch to a different space
 * @param {Page} page - Playwright page object
 * @param {string} spaceName - Name of the space to switch to
 */
export async function switchSpace(page, spaceName) {
  // Click on space selector
  await page.click('.space-selector, [data-testid="space-selector"]');
  
  // Select the space
  await page.click(`text="${spaceName}"`);
  
  // Wait for space change confirmation
  await page.waitForSelector(`:has-text("Switched to ${spaceName}")`, { timeout: 5000 });
}

/**
 * Take a screenshot with timestamp
 * @param {Page} page - Playwright page object
 * @param {string} name - Screenshot name
 */
export async function takeTimestampedScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `tests-playwright/screenshots/${name}-${timestamp}.png`,
    fullPage: true 
  });
}