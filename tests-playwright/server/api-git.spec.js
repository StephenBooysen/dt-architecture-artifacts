/**
 * API Git operations tests for the server
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000/api';

test.describe('API Git Operations', () => {
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

  test('should get git status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/git/status`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    // Git status should return information about the repository
    expect(responseData).toBeDefined();
    expect(responseData.success).toBe(true);
    
    // Should have status information
    expect(responseData.status).toBeDefined();
    expect(responseData.branch).toBeDefined();
  });

  test('should get git log', async ({ request }) => {
    const response = await request.get(`${API_BASE}/git/log`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.commits)).toBe(true);
    
    // Each commit should have required fields
    if (responseData.commits.length > 0) {
      const commit = responseData.commits[0];
      expect(commit.hash).toBeDefined();
      expect(commit.message).toBeDefined();
      expect(commit.author).toBeDefined();
      expect(commit.date).toBeDefined();
    }
  });

  test('should commit changes', async ({ request }) => {
    // First create a file to commit
    const fileName = `commit-test-${Date.now()}.md`;
    const fileContent = '# Commit Test File\n\nThis file is created for commit testing.';
    
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
    
    // Now commit the changes
    const commitMessage = `Add ${fileName} for testing`;
    const response = await request.post(`${API_BASE}/git/commit`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        message: commitMessage,
        files: [fileName]
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.commitHash).toBeDefined();
  });

  test('should handle commit with no changes', async ({ request }) => {
    const response = await request.post(`${API_BASE}/git/commit`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        message: 'No changes to commit',
        files: []
      }
    });
    
    // Should either succeed with no changes or return appropriate message
    expect([200, 400]).toContain(response.status());
    
    const responseData = await response.json();
    if (response.status() === 400) {
      expect(responseData.message).toMatch(/no changes|nothing to commit/i);
    }
  });

  test('should get git diff', async ({ request }) => {
    // Create and modify a file to have diff
    const fileName = `diff-test-${Date.now()}.md`;
    const originalContent = '# Original Content';
    const modifiedContent = '# Modified Content\n\nThis content has been changed.';
    
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
    
    // Commit it
    await request.post(`${API_BASE}/git/commit`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        message: `Initial commit of ${fileName}`,
        files: [fileName]
      }
    });
    
    // Modify the file
    await request.put(`${API_BASE}/files/${encodeURIComponent(fileName)}`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        content: modifiedContent
      }
    });
    
    // Get diff
    const response = await request.get(`${API_BASE}/git/diff`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.diff).toBeDefined();
  });

  test('should pull from remote repository', async ({ request }) => {
    const response = await request.post(`${API_BASE}/git/pull`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      }
    });
    
    // Pull might succeed or fail depending on remote configuration
    expect([200, 400, 500]).toContain(response.status());
    
    const responseData = await response.json();
    expect(responseData).toBeDefined();
    
    if (response.status() === 200) {
      expect(responseData.success).toBe(true);
    } else {
      // Should have an error message
      expect(responseData.message).toBeDefined();
    }
  });

  test('should push to remote repository', async ({ request }) => {
    const response = await request.post(`${API_BASE}/git/push`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      }
    });
    
    // Push might succeed or fail depending on remote configuration
    expect([200, 400, 500]).toContain(response.status());
    
    const responseData = await response.json();
    expect(responseData).toBeDefined();
    
    if (response.status() === 200) {
      expect(responseData.success).toBe(true);
    } else {
      // Should have an error message
      expect(responseData.message).toBeDefined();
    }
  });

  test('should get current branch', async ({ request }) => {
    const response = await request.get(`${API_BASE}/git/branch`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(responseData.currentBranch).toBeDefined();
    expect(typeof responseData.currentBranch).toBe('string');
  });

  test('should list all branches', async ({ request }) => {
    const response = await request.get(`${API_BASE}/git/branches`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.branches)).toBe(true);
    expect(responseData.branches.length).toBeGreaterThan(0);
  });

  test('should create a new branch', async ({ request }) => {
    const branchName = `test-branch-${Date.now()}`;
    
    const response = await request.post(`${API_BASE}/git/branch`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        branchName: branchName
      }
    });
    
    expect(response.status()).toBe(200);
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    
    // Verify branch was created by listing branches
    const branchesResponse = await request.get(`${API_BASE}/git/branches`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    const branchesData = await branchesResponse.json();
    const branchExists = branchesData.branches.some(branch => 
      branch.name === branchName || branch === branchName
    );
    expect(branchExists).toBe(true);
  });

  test('should switch to different branch', async ({ request }) => {
    // First get current branch
    const currentResponse = await request.get(`${API_BASE}/git/branch`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    const currentData = await currentResponse.json();
    const currentBranch = currentData.currentBranch;
    
    // Get list of branches
    const branchesResponse = await request.get(`${API_BASE}/git/branches`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    const branchesData = await branchesResponse.json();
    
    // Find a different branch to switch to
    const availableBranches = branchesData.branches.filter(branch => {
      const branchName = branch.name || branch;
      return branchName !== currentBranch && !branchName.startsWith('origin/');
    });
    
    if (availableBranches.length > 0) {
      const targetBranch = availableBranches[0].name || availableBranches[0];
      
      const response = await request.post(`${API_BASE}/git/checkout`, {
        headers: {
          'Cookie': authCookies,
          'Content-Type': 'application/json'
        },
        data: {
          branch: targetBranch
        }
      });
      
      expect(response.status()).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      
      // Switch back to original branch
      await request.post(`${API_BASE}/git/checkout`, {
        headers: {
          'Cookie': authCookies,
          'Content-Type': 'application/json'
        },
        data: {
          branch: currentBranch
        }
      });
    } else {
      test.skip('No additional branches available for checkout test');
    }
  });

  test('should get remote repository information', async ({ request }) => {
    const response = await request.get(`${API_BASE}/git/remote`, {
      headers: {
        'Cookie': authCookies
      }
    });
    
    // Remote info might not be configured
    expect([200, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.remotes).toBeDefined();
    }
  });

  test('should require authentication for git operations', async ({ request }) => {
    const response = await request.get(`${API_BASE}/git/status`);
    
    expect(response.status()).toBe(401);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
  });

  test('should validate commit message', async ({ request }) => {
    const response = await request.post(`${API_BASE}/git/commit`, {
      headers: {
        'Cookie': authCookies,
        'Content-Type': 'application/json'
      },
      data: {
        message: '', // Empty commit message
        files: []
      }
    });
    
    expect(response.status()).toBe(400);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
    expect(responseData.message).toMatch(/message|required/i);
  });

});