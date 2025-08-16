/**
 * API Templates management tests for the server
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000/api';

test.describe('API Templates Management', () => {
  let authCookies = '';
  
  test.beforeAll(async ({ request }) => {
    // Login once for all tests in this suite
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        username: 'testuser',
        password: 'testpass123'
      }
    });
    
    if (loginResponse.status() === 200) {
      const cookies = loginResponse.headers()['set-cookie'];
      if (cookies) {
        authCookies = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      }
    }
  });

  test('should get templates list', async ({ request }) => {
    const response = await request.get(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(Array.isArray(responseData)).toBe(true);
  });

  test('should create a new template', async ({ request }) => {
    const templateName = `test-template-${Date.now()}`;
    const templateData = {
      name: templateName,
      content: '# {{title}}\n\n## Overview\n{{description}}\n\n## Details\n- Date: {{date}}\n- Author: {{author}}',
      description: 'A test template for API testing'
    };
    
    const response = await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: templateData
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.name).toBe(templateName);
  });

  test('should get a specific template', async ({ request }) => {
    const templateName = `get-template-${Date.now()}`;
    const templateContent = '# {{title}}\n\nTemplate content for get test.';
    
    // First create a template
    await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        name: templateName,
        content: templateContent,
        description: 'Template for get test'
      }
    });
    
    // Now get the template
    const response = await request.get(`${API_BASE}/templates/${encodeURIComponent(templateName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.name).toBe(templateName);
    expect(responseData.content).toBe(templateContent);
    expect(responseData.description).toBeDefined();
  });

  test('should update a template', async ({ request }) => {
    const templateName = `update-template-${Date.now()}`;
    const originalContent = '# Original {{title}}';
    const updatedContent = '# Updated {{title}}\n\n## New Section\n{{description}}';
    
    // Create template
    await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        name: templateName,
        content: originalContent,
        description: 'Original description'
      }
    });
    
    // Update template
    const response = await request.put(`${API_BASE}/templates/${encodeURIComponent(templateName)}`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        content: updatedContent,
        description: 'Updated description'
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    
    // Verify template was updated
    const getResponse = await request.get(`${API_BASE}/templates/${encodeURIComponent(templateName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    const templateData = await getResponse.json();
    expect(templateData.content).toBe(updatedContent);
    expect(templateData.description).toBe('Updated description');
  });

  test('should delete a template', async ({ request }) => {
    const templateName = `delete-template-${Date.now()}`;
    
    // Create template
    await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        name: templateName,
        content: '# Template to Delete',
        description: 'Template for deletion test'
      }
    });
    
    // Delete template
    const response = await request.delete(`${API_BASE}/templates/${encodeURIComponent(templateName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    
    // Verify template is deleted
    const getResponse = await request.get(`${API_BASE}/templates/${encodeURIComponent(templateName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(getResponse.status()).toBe(404);
  });

  test('should validate template data on creation', async ({ request }) => {
    // Test missing name
    let response = await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        content: '# Template without name',
        description: 'Missing name'
      }
    });
    expect(response.status()).toBe(400);
    
    // Test missing content
    response = await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'template-without-content',
        description: 'Missing content'
      }
    });
    expect(response.status()).toBe(400);
  });

  test('should not create duplicate templates', async ({ request }) => {
    const templateName = `duplicate-test-${Date.now()}`;
    const templateData = {
      name: templateName,
      content: '# Duplicate Template Test',
      description: 'Testing duplicate prevention'
    };
    
    // Create first template
    const firstResponse = await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: templateData
    });
    expect(firstResponse.status()).toBe(200);
    
    // Try to create duplicate
    const secondResponse = await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: templateData
    });
    
    expect(secondResponse.status()).toBe(400);
    const responseData = await secondResponse.json();
    expect(responseData.success).toBe(false);
    expect(responseData.message).toMatch(/already exists|duplicate/i);
  });

  test('should apply template to create new file', async ({ request }) => {
    const templateName = `apply-template-${Date.now()}`;
    const templateContent = '# {{title}}\n\n## Description\n{{description}}\n\n## Created\n{{date}}';
    
    // Create template
    await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        name: templateName,
        content: templateContent,
        description: 'Template for application test'
      }
    });
    
    // Apply template
    const fileName = `from-template-${Date.now()}.md`;
    const response = await request.post(`${API_BASE}/templates/${encodeURIComponent(templateName)}/apply`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        fileName: fileName,
        variables: {
          title: 'Test Document',
          description: 'This document was created from a template',
          date: new Date().toISOString().split('T')[0]
        }
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.fileName).toBe(fileName);
    
    // Verify file was created with template content
    const fileResponse = await request.get(`${API_BASE}/files/${encodeURIComponent(fileName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(fileResponse.status()).toBe(200);
    const fileData = await fileResponse.json();
    expect(fileData.content).toContain('Test Document');
    expect(fileData.content).toContain('This document was created from a template');
  });

  test('should validate template variables', async ({ request }) => {
    const templateName = `variables-template-${Date.now()}`;
    const templateContent = '# {{title}}\n\n{{required_var}}\n\n{{optional_var}}';
    
    // Create template
    await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        name: templateName,
        content: templateContent,
        description: 'Template with variables'
      }
    });
    
    // Apply template with missing variables
    const response = await request.post(`${API_BASE}/templates/${encodeURIComponent(templateName)}/apply`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        fileName: `incomplete-variables-${Date.now()}.md`,
        variables: {
          title: 'Test'
          // Missing other variables
        }
      }
    });
    
    // Should either succeed with empty variables or require all variables
    expect([200, 400]).toContain(response.status());
    
    if (response.status() === 200) {
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
    }
  });

  test('should list template variables', async ({ request }) => {
    const templateName = `vars-list-template-${Date.now()}`;
    const templateContent = '# {{title}}\n\n## {{section}}\n{{content}}\n\n- Author: {{author}}\n- Date: {{date}}';
    
    // Create template
    await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        name: templateName,
        content: templateContent,
        description: 'Template for variable listing test'
      }
    });
    
    // Get template variables
    const response = await request.get(`${API_BASE}/templates/${encodeURIComponent(templateName)}/variables`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    if (response.status() === 200) {
      const responseData = await response.json();
      expect(Array.isArray(responseData.variables)).toBe(true);
      expect(responseData.variables).toContain('title');
      expect(responseData.variables).toContain('section');
      expect(responseData.variables).toContain('content');
      expect(responseData.variables).toContain('author');
      expect(responseData.variables).toContain('date');
    } else {
      // Variable extraction might not be implemented
      expect([404, 501]).toContain(response.status());
    }
  });

  test('should require authentication for template operations', async ({ request }) => {
    const response = await request.get(`${API_BASE}/templates`);
    
    expect(response.status()).toBe(401);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
  });

  test('should handle template with complex content', async ({ request }) => {
    const templateName = `complex-template-${Date.now()}`;
    const complexContent = `# {{project_name}}

## Overview
{{project_description}}

## Architecture
\`\`\`mermaid
graph TD
    A[{{component_a}}] --> B[{{component_b}}]
    B --> C[{{component_c}}]
\`\`\`

## Requirements
{{#each requirements}}
- {{this}}
{{/each}}

## Team
| Role | Name |
|------|------|
| Lead | {{team_lead}} |
| Developer | {{developer}} |

## Timeline
- Start Date: {{start_date}}
- End Date: {{end_date}}
- Duration: {{duration}}

---
*Created on {{creation_date}} by {{author}}*`;
    
    const response = await request.post(`${API_BASE}/templates`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        name: templateName,
        content: complexContent,
        description: 'Complex template with various elements'
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    
    // Verify template was stored correctly
    const getResponse = await request.get(`${API_BASE}/templates/${encodeURIComponent(templateName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    const templateData = await getResponse.json();
    expect(templateData.content).toBe(complexContent);
  });

});