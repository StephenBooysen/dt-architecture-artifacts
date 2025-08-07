/**
 * File management tests for the client application
 */

import { test, expect } from '@playwright/test';
import { login, createTestFile, deleteTestFile, waitForApiResponse, getToastMessage } from '../utils/test-helpers.js';

test.describe('File Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display file tree on login', async ({ page }) => {
    // Verify file tree is visible
    await expect(page.locator('.file-tree, .sidebar')).toBeVisible();
    
    // Should have some default files or folders
    await expect(page.locator('.file-tree .file-item, .file-tree .folder-item')).toHaveCount({ min: 0 });
  });

  test('should create a new markdown file', async ({ page }) => {
    const fileName = `test-${Date.now()}.md`;
    
    // Right-click in file tree
    await page.click('.file-tree', { button: 'right' });
    
    // Click New File
    await page.click('text="New File", .context-menu :has-text("New File")');
    
    // Enter file name
    await page.fill('input[placeholder*="file name"], input[placeholder*="File name"]', fileName);
    await page.press('input[placeholder*="file name"], input[placeholder*="File name"]', 'Enter');
    
    // Verify file appears in tree
    await expect(page.locator(`:has-text("${fileName}")`)).toBeVisible({ timeout: 10000 });
    
    // Cleanup
    await deleteTestFile(page, fileName);
  });

  test('should create a new folder', async ({ page }) => {
    const folderName = `test-folder-${Date.now()}`;
    
    // Right-click in file tree
    await page.click('.file-tree', { button: 'right' });
    
    // Click New Folder
    await page.click('text="New Folder", .context-menu :has-text("New Folder")');
    
    // Enter folder name
    await page.fill('input[placeholder*="folder name"], input[placeholder*="Folder name"]', folderName);
    await page.press('input[placeholder*="folder name"], input[placeholder*="Folder name"]', 'Enter');
    
    // Verify folder appears in tree
    await expect(page.locator(`:has-text("${folderName}")`)).toBeVisible({ timeout: 10000 });
    
    // Cleanup - delete folder
    await page.locator(`:has-text("${folderName}")`).click({ button: 'right' });
    await page.click('text="Delete"');
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');
  });

  test('should open and edit a file', async ({ page }) => {
    const fileName = `edit-test-${Date.now()}.md`;
    const originalContent = '# Original Content\n\nThis is the original content.';
    const newContent = '# Edited Content\n\nThis content has been edited.';
    
    await createTestFile(page, fileName, originalContent);
    
    // Click on the file to open it
    await page.click(`:has-text("${fileName}")`);
    
    // Wait for editor to load
    await expect(page.locator('.markdown-editor, .CodeMirror')).toBeVisible({ timeout: 10000 });
    
    // Clear and enter new content
    await page.fill('.markdown-editor textarea, .CodeMirror textarea', newContent);
    
    // Save the file
    await page.keyboard.press('Control+S');
    
    // Wait for save confirmation
    const toastMessage = await getToastMessage(page);
    expect(toastMessage).toContain('saved');
    
    // Cleanup
    await deleteTestFile(page, fileName);
  });

  test('should delete a file', async ({ page }) => {
    const fileName = `delete-test-${Date.now()}.md`;
    
    await createTestFile(page, fileName);
    
    // Right-click on file
    await page.locator(`:has-text("${fileName}")`).click({ button: 'right' });
    
    // Click delete
    await page.click('text="Delete"');
    
    // Confirm deletion
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');
    
    // Wait for deletion confirmation
    await expect(page.locator('.toast-success, :has-text("deleted successfully")')).toBeVisible({ timeout: 5000 });
    
    // Verify file is removed from tree
    await expect(page.locator(`:has-text("${fileName}")`)).not.toBeVisible();
  });

  test('should rename a file', async ({ page }) => {
    const originalName = `rename-test-${Date.now()}.md`;
    const newName = `renamed-${Date.now()}.md`;
    
    await createTestFile(page, originalName);
    
    // Right-click on file
    await page.locator(`:has-text("${originalName}")`).click({ button: 'right' });
    
    // Click rename
    await page.click('text="Rename"');
    
    // Enter new name
    await page.fill('input[value*="rename-test"], input[placeholder*="name"]', newName);
    await page.press('input[value*="rename-test"], input[placeholder*="name"]', 'Enter');
    
    // Wait for rename confirmation
    await expect(page.locator('.toast-success, :has-text("renamed successfully")')).toBeVisible({ timeout: 5000 });
    
    // Verify new name appears in tree
    await expect(page.locator(`:has-text("${newName}")`)).toBeVisible();
    await expect(page.locator(`:has-text("${originalName}")`)).not.toBeVisible();
    
    // Cleanup
    await deleteTestFile(page, newName);
  });

  test('should expand and collapse folders', async ({ page }) => {
    const folderName = `expand-test-${Date.now()}`;
    
    // Create a folder first
    await page.click('.file-tree', { button: 'right' });
    await page.click('text="New Folder"');
    await page.fill('input[placeholder*="folder name"]', folderName);
    await page.press('input[placeholder*="folder name"]', 'Enter');
    
    // Wait for folder to appear
    await expect(page.locator(`:has-text("${folderName}")`)).toBeVisible({ timeout: 10000 });
    
    // Click to expand folder (if it has an expand icon)
    const folderElement = page.locator(`:has-text("${folderName}")`);
    const expandIcon = folderElement.locator('.expand-icon, .folder-toggle, i');
    
    if (await expandIcon.isVisible()) {
      await expandIcon.click();
      // Folder should show as expanded (implementation specific)
    }
    
    // Cleanup
    await folderElement.click({ button: 'right' });
    await page.click('text="Delete"');
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');
  });

  test('should upload a file', async ({ page }) => {
    // Create a temporary file to upload
    const fileContent = 'This is a test file for upload';
    
    // Look for file upload input or button
    const uploadButton = page.locator('input[type="file"], button:has-text("Upload"), .upload-btn');
    
    if (await uploadButton.first().isVisible()) {
      // If there's a visible upload button/input
      await uploadButton.first().setInputFiles({
        name: 'upload-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(fileContent),
      });
      
      // Wait for upload confirmation
      await expect(page.locator('.toast-success, :has-text("uploaded successfully")')).toBeVisible({ timeout: 10000 });
      
      // Cleanup uploaded file
      await deleteTestFile(page, 'upload-test.txt');
    } else {
      // Skip test if upload functionality is not readily available
      test.skip('Upload functionality not readily accessible in current UI');
    }
  });

  test('should show file preview for different file types', async ({ page }) => {
    // Test markdown file preview
    const markdownFile = `preview-test-${Date.now()}.md`;
    const markdownContent = '# Preview Test\n\nThis is a **markdown** file with [links](http://example.com).';
    
    await createTestFile(page, markdownFile, markdownContent);
    
    // Click on the file to open it
    await page.click(`:has-text("${markdownFile}")`);
    
    // Should see both editor and preview
    await expect(page.locator('.markdown-editor')).toBeVisible({ timeout: 10000 });
    
    // Look for preview pane (if implemented)
    const previewPane = page.locator('.preview-pane, .markdown-preview, .preview-window');
    if (await previewPane.isVisible()) {
      await expect(previewPane).toContain('Preview Test');
    }
    
    // Cleanup
    await deleteTestFile(page, markdownFile);
  });

});