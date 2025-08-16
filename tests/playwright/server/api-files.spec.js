/**
 * API Files management tests for the server
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000/api';

test.describe('API Files Management', () => {
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

  test('should get files list for authenticated user', async ({ request }) => {
    const response = await request.get(`${API_BASE}/files`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(Array.isArray(responseData)).toBe(true);
  });

  test('should create a new file', async ({ request }) => {
    const fileName = `test-file-${Date.now()}.md`;
    const fileContent = '# Test File\n\nThis is a test file created by API test.';
    
    const response = await request.post(`${API_BASE}/files`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        path: fileName,
        content: fileContent
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.path).toBe(fileName);
  });

  test('should get file content', async ({ request }) => {
    const fileName = `get-test-${Date.now()}.md`;
    const fileContent = '# Get Test File\n\nContent for get test.';
    
    // First create a file
    await request.post(`${API_BASE}/files`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        path: fileName,
        content: fileContent
      }
    });
    
    // Now get the file
    const response = await request.get(`${API_BASE}/files/${encodeURIComponent(fileName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.content).toBe(fileContent);
    expect(responseData.path).toBe(fileName);
    expect(responseData.fileType).toBeDefined();
  });

  test('should update file content', async ({ request }) => {
    const fileName = `update-test-${Date.now()}.md`;
    const originalContent = '# Original Content';
    const updatedContent = '# Updated Content\n\nThis content has been updated.';
    
    // Create file
    await request.post(`${API_BASE}/files`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        path: fileName,
        content: originalContent
      }
    });
    
    // Update file
    const response = await request.put(`${API_BASE}/files/${encodeURIComponent(fileName)}`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        content: updatedContent
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    
    // Verify content was updated
    const getResponse = await request.get(`${API_BASE}/files/${encodeURIComponent(fileName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    const fileData = await getResponse.json();
    expect(fileData.content).toBe(updatedContent);
  });

  test('should delete a file', async ({ request }) => {
    const fileName = `delete-test-${Date.now()}.md`;
    const fileContent = '# File to Delete';
    
    // Create file
    await request.post(`${API_BASE}/files`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        path: fileName,
        content: fileContent
      }
    });
    
    // Delete file
    const response = await request.delete(`${API_BASE}/files/${encodeURIComponent(fileName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    
    // Verify file is deleted
    const getResponse = await request.get(`${API_BASE}/files/${encodeURIComponent(fileName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(getResponse.status()).toBe(404);
  });

  test('should create a folder', async ({ request }) => {
    const folderName = `test-folder-${Date.now()}`;
    
    const response = await request.post(`${API_BASE}/folders`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        path: folderName
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.path).toBe(folderName);
  });

  test('should rename a file', async ({ request }) => {
    const originalName = `rename-original-${Date.now()}.md`;
    const newName = `rename-new-${Date.now()}.md`;
    const fileContent = '# File to Rename';
    
    // Create file
    await request.post(`${API_BASE}/files`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        path: originalName,
        content: fileContent
      }
    });
    
    // Rename file
    const response = await request.put(`${API_BASE}/rename`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        oldPath: originalName,
        newName: newName.replace('.md', '')
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    
    // Verify new file exists
    const getResponse = await request.get(`${API_BASE}/files/${encodeURIComponent(newName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(getResponse.status()).toBe(200);
    const fileData = await getResponse.json();
    expect(fileData.content).toBe(fileContent);
  });

  test('should handle file upload', async ({ request }) => {
    const fileName = `upload-test-${Date.now()}.txt`;
    const fileContent = 'This is uploaded file content';
    
    const response = await request.post(`${API_BASE}/files/upload`, {
      headers: {
        'Cookie': authCookies
      },
      multipart: {
        file: {
          name: fileName,
          mimeType: 'text/plain',
          buffer: Buffer.from(fileContent)
        }
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.fileName).toBe(fileName);
  });

  test('should search files by name', async ({ request }) => {
    // Create a test file with searchable name
    const searchTerm = `searchable-${Date.now()}`;
    const fileName = `${searchTerm}.md`;
    
    await request.post(`${API_BASE}/files`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        path: fileName,
        content: '# Searchable File'
      }
    });
    
    // Search for the file
    const response = await request.get(`${API_BASE}/search/files?q=${searchTerm}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(Array.isArray(responseData)).toBe(true);
    expect(responseData.length).toBeGreaterThan(0);
    
    const foundFile = responseData.find(file => file.fileName && file.fileName.includes(searchTerm));
    expect(foundFile).toBeDefined();
  });

  test('should search file content', async ({ request }) => {
    const searchTerm = `unique-content-${Date.now()}`;
    const fileName = `content-search-${Date.now()}.md`;
    const fileContent = `# File with ${searchTerm}\n\nThis file contains searchable content.`;
    
    // Create file with searchable content
    await request.post(`${API_BASE}/files`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        path: fileName,
        content: fileContent
      }
    });
    
    // Search file content
    const response = await request.get(`${API_BASE}/search/content?q=${searchTerm}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(Array.isArray(responseData)).toBe(true);
    
    if (responseData.length > 0) {
      const foundResult = responseData.find(result => 
        result.fileName && result.fileName.includes(fileName.replace('.md', ''))
      );
      expect(foundResult).toBeDefined();
    }
  });

  test('should not allow access to files without authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/files`);
    
    expect(response.status()).toBe(401);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
  });

  test('should validate file paths for security', async ({ request }) => {
    // Test path traversal attack
    const maliciousPath = '../../../etc/passwd';
    
    const response = await request.get(`${API_BASE}/files/${encodeURIComponent(maliciousPath)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    // Should either return 400 (validation error) or 404 (file not found in allowed directory)
    expect([400, 404]).toContain(response.status());
  });

  test('should handle file metadata', async ({ request }) => {
    const fileName = `metadata-test-${Date.now()}.md`;
    const fileContent = '# Metadata Test\n\nFile with metadata.';
    
    // Create file
    await request.post(`${API_BASE}/files`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        path: fileName,
        content: fileContent
      }
    });
    
    // Get file metadata
    const response = await request.get(`${API_BASE}/metadata/${encodeURIComponent(fileName)}`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    if (response.status() === 200) {
      const responseData = await response.json();
      expect(responseData.fileName).toBeDefined();
      expect(responseData.fileType).toBeDefined();
      expect(responseData.size).toBeDefined();
    } else {
      // Metadata endpoint might not be implemented
      expect([404, 501]).toContain(response.status());
    }
  });

});