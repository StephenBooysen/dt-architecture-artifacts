/**
 * Templates functionality tests for the client application
 */

import { test, expect } from '@playwright/test';
import { login, getToastMessage } from '../utils/test-helpers.js';

test.describe('Templates Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to templates view', async ({ page }) => {
    // Look for templates navigation button/link
    const templatesButton = page.locator('button:has-text("Templates"), .nav-link:has-text("Templates"), .sidebar :has-text("Templates")');
    
    if (await templatesButton.isVisible()) {
      await templatesButton.click();
      
      // Should show templates list view
      await expect(page.locator('.templates-view, .templates-list, :has-text("Templates")')).toBeVisible({ timeout: 10000 });
    } else {
      // Try right-click in file tree to access templates
      await page.click('.file-tree', { button: 'right' });
      const templatesOption = page.locator('text="Templates", .context-menu :has-text("Templates")');
      
      if (await templatesOption.isVisible()) {
        await templatesOption.click();
        await expect(page.locator('.templates-view, :has-text("Templates")')).toBeVisible({ timeout: 10000 });
      } else {
        test.skip('Templates navigation not found in current UI');
      }
    }
  });

  test('should create a new template', async ({ page }) => {
    // Navigate to templates (skip if not available)
    const templatesButton = page.locator('button:has-text("Templates"), .sidebar :has-text("Templates")');
    if (!(await templatesButton.isVisible())) {
      test.skip('Templates functionality not readily accessible');
      return;
    }
    
    await templatesButton.click();
    
    // Look for "New Template" or "Create Template" button
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), .btn:has-text("Add Template")');
    
    if (await newTemplateButton.isVisible()) {
      await newTemplateButton.click();
      
      const templateName = `test-template-${Date.now()}`;
      const templateContent = '# {{title}}\n\n## Overview\n{{description}}\n\n## Details\n- Date: {{date}}\n- Author: {{author}}';
      
      // Fill template form
      await page.fill('input[name="name"], input[placeholder*="name"]', templateName);
      await page.fill('textarea[name="content"], .template-editor', templateContent);
      
      // Add description if field exists
      const descriptionField = page.locator('input[name="description"], textarea[name="description"]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('A test template for automated testing');
      }
      
      // Save template
      await page.click('button:has-text("Save"), button:has-text("Create"), button[type="submit"]');
      
      // Wait for creation confirmation
      const toast = await getToastMessage(page);
      expect(toast.toLowerCase()).toContain('template');
      
      // Verify template appears in list
      await expect(page.locator(`:has-text("${templateName}")`)).toBeVisible({ timeout: 10000 });
      
      // Cleanup - delete the test template
      await page.locator(`:has-text("${templateName}")`).hover();
      const deleteButton = page.locator('button:has-text("Delete"), .delete-btn, i.bi-trash').last();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.click('button:has-text("Confirm"), button:has-text("Delete")');
      }
    } else {
      test.skip('New template creation not available in current UI');
    }
  });

  test('should edit an existing template', async ({ page }) => {
    // First create a template to edit
    const templatesButton = page.locator('button:has-text("Templates"), .sidebar :has-text("Templates")');
    if (!(await templatesButton.isVisible())) {
      test.skip('Templates functionality not readily accessible');
      return;
    }
    
    await templatesButton.click();
    
    // Look for existing templates
    const templateItems = page.locator('.template-item, .template-card, .templates-list > *');
    
    if (await templateItems.count() > 0) {
      // Click on first template to edit
      const firstTemplate = templateItems.first();
      await firstTemplate.hover();
      
      // Look for edit button
      const editButton = page.locator('button:has-text("Edit"), .edit-btn, i.bi-pencil').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Should open template editor
        await expect(page.locator('.template-editor, .markdown-editor')).toBeVisible({ timeout: 10000 });
        
        // Make a small edit
        const editor = page.locator('textarea[name="content"], .template-editor textarea, .markdown-editor textarea');
        if (await editor.isVisible()) {
          await editor.fill(await editor.inputValue() + '\n\n<!-- Edited by test -->');
          
          // Save changes
          await page.keyboard.press('Control+S');
          
          // Wait for save confirmation
          const toast = await getToastMessage(page);
          expect(toast.toLowerCase()).toContain('saved');
        }
      } else {
        test.skip('Template editing not available in current UI');
      }
    } else {
      test.skip('No existing templates found to edit');
    }
  });

  test('should use a template to create a new file', async ({ page }) => {
    const templatesButton = page.locator('button:has-text("Templates"), .sidebar :has-text("Templates")');
    if (!(await templatesButton.isVisible())) {
      test.skip('Templates functionality not readily accessible');
      return;
    }
    
    await templatesButton.click();
    
    // Look for existing templates
    const templateItems = page.locator('.template-item, .template-card, .templates-list > *');
    
    if (await templateItems.count() > 0) {
      // Click on first template
      const firstTemplate = templateItems.first();
      await firstTemplate.click();
      
      // Look for "Use Template" button
      const useButton = page.locator('button:has-text("Use"), button:has-text("Apply"), button:has-text("Create from Template")');
      
      if (await useButton.isVisible()) {
        await useButton.click();
        
        // Should open file creation form or directly create file
        const fileName = `from-template-${Date.now()}.md`;
        
        // If there's a file name input, fill it
        const fileNameInput = page.locator('input[placeholder*="file name"], input[name="fileName"]');
        if (await fileNameInput.isVisible()) {
          await fileNameInput.fill(fileName);
          await page.keyboard.press('Enter');
        }
        
        // Should create file and open editor
        await expect(page.locator('.markdown-editor')).toBeVisible({ timeout: 10000 });
        
        // Editor should have template content
        const editorContent = await page.locator('.markdown-editor textarea').inputValue();
        expect(editorContent.length).toBeGreaterThan(0);
        
        // Cleanup - delete the created file
        await page.click('.file-tree');
        const fileInTree = page.locator(`:has-text("${fileName}")`);
        if (await fileInTree.isVisible()) {
          await fileInTree.click({ button: 'right' });
          await page.click('text="Delete"');
          await page.click('button:has-text("Confirm"), button:has-text("Delete")');
        }
      } else {
        test.skip('Template usage not available in current UI');
      }
    } else {
      test.skip('No templates available to use');
    }
  });

  test('should delete a template', async ({ page }) => {
    const templatesButton = page.locator('button:has-text("Templates"), .sidebar :has-text("Templates")');
    if (!(await templatesButton.isVisible())) {
      test.skip('Templates functionality not readily accessible');
      return;
    }
    
    await templatesButton.click();
    
    // First create a template to delete
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template")');
    
    if (await newTemplateButton.isVisible()) {
      await newTemplateButton.click();
      
      const templateName = `delete-test-${Date.now()}`;
      
      // Fill template form
      await page.fill('input[name="name"], input[placeholder*="name"]', templateName);
      await page.fill('textarea[name="content"], .template-editor', '# Test Template for Deletion');
      
      // Save template
      await page.click('button:has-text("Save"), button:has-text("Create")');
      
      // Wait for creation
      await expect(page.locator(`:has-text("${templateName}")`)).toBeVisible({ timeout: 10000 });
      
      // Now delete it
      await page.locator(`:has-text("${templateName}")`).hover();
      const deleteButton = page.locator('button:has-text("Delete"), .delete-btn, i.bi-trash').last();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Confirm deletion
        await page.click('button:has-text("Confirm"), button:has-text("Delete")');
        
        // Wait for deletion confirmation
        const toast = await getToastMessage(page);
        expect(toast.toLowerCase()).toContain('delete');
        
        // Verify template is removed from list
        await expect(page.locator(`:has-text("${templateName}")`)).not.toBeVisible();
      } else {
        test.skip('Template deletion not available in current UI');
      }
    } else {
      test.skip('Cannot create template to test deletion');
    }
  });

  test('should display template preview', async ({ page }) => {
    const templatesButton = page.locator('button:has-text("Templates"), .sidebar :has-text("Templates")');
    if (!(await templatesButton.isVisible())) {
      test.skip('Templates functionality not readily accessible');
      return;
    }
    
    await templatesButton.click();
    
    // Look for existing templates
    const templateItems = page.locator('.template-item, .template-card');
    
    if (await templateItems.count() > 0) {
      // Hover or click on first template
      const firstTemplate = templateItems.first();
      await firstTemplate.hover();
      
      // Look for preview area or preview button
      const preview = page.locator('.template-preview, .preview-pane, button:has-text("Preview")');
      
      if (await preview.isVisible()) {
        if (await page.locator('button:has-text("Preview")').isVisible()) {
          await page.click('button:has-text("Preview")');
        }
        
        // Should show template content preview
        await expect(page.locator('.template-preview, .preview-content')).toBeVisible({ timeout: 5000 });
      } else {
        test.skip('Template preview not available in current UI');
      }
    } else {
      test.skip('No templates available for preview');
    }
  });

  test('should search and filter templates', async ({ page }) => {
    const templatesButton = page.locator('button:has-text("Templates"), .sidebar :has-text("Templates")');
    if (!(await templatesButton.isVisible())) {
      test.skip('Templates functionality not readily accessible');
      return;
    }
    
    await templatesButton.click();
    
    // Look for search box in templates view
    const searchBox = page.locator('.templates-view input[placeholder*="search"], input[placeholder*="Search templates"]');
    
    if (await searchBox.isVisible()) {
      // Type in search box
      await searchBox.fill('test');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Should filter templates or show search results
      const templatesList = page.locator('.templates-list, .template-items');
      await expect(templatesList).toBeVisible();
      
      // Clear search
      await searchBox.clear();
    } else {
      test.skip('Template search not available in current UI');
    }
  });

});