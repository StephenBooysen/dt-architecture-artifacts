import React from 'react';
import SwaggerEmbed from '../shared/SwaggerEmbed';

const Workspace = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-folders"></i>
          Workspace Management
          <div className="status-indicator" id="workspace-status"></div>
        </h1>
        <div className="header-actions">
          <p>Manage multi-storage workspaces for Private, Public, and Enterprise environments</p>
        </div>
      </div>

      {/* Active Workspace Display */}
      <div className="workspace-section">
        <div className="workspace-current">
          <h2><i className="bi bi-folder-check me-2"></i>Current Workspace</h2>
          <div className="current-workspace-display" id="currentWorkspaceDisplay">
            <div className="workspace-card" id="activeWorkspaceCard">
              <div className="workspace-info">
                <span className="workspace-name">Loading...</span>
                <span className="workspace-type badge">-</span>
                <span className="workspace-storage">Storage: -</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace List */}
      <div className="workspace-section">
        <div className="workspace-list">
          <h2><i className="bi bi-list-ul me-2"></i>Available Workspaces</h2>
          <div className="workspace-grid" id="workspaceList">
            <div className="loading-state">Loading workspaces...</div>
          </div>
        </div>
      </div>

      {/* Create New Workspace */}
      <div className="workspace-section">
        <div className="workspace-form">
          <h2><i className="bi bi-plus-circle me-2"></i>Create New Workspace</h2>
          <form id="create-workspace-form">
            <div className="form-group">
              <label htmlFor="workspace-id">Workspace ID</label>
              <input 
                type="text" 
                id="workspace-id" 
                name="workspace-id" 
                className="form-control" 
                placeholder="Enter unique workspace identifier (e.g., 'my-project')"
                pattern="[a-zA-Z0-9-_]+"
                title="Only letters, numbers, hyphens, and underscores allowed"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="workspace-type">Workspace Type</label>
              <select id="workspace-type" name="workspace-type" className="form-control" required>
                <option value="">Select workspace type...</option>
                <option value="private">Private - Local storage, owner-only access</option>
                <option value="public">Public - Cloud storage, collaborative access</option>
                <option value="enterprise">Enterprise - Git-based, role-based permissions</option>
              </select>
            </div>

            <div className="form-group" id="advanced-config" style={{display: 'none'}}>
              <label htmlFor="workspace-config">Advanced Configuration (JSON)</label>
              <textarea 
                id="workspace-config" 
                name="workspace-config" 
                className="form-control textarea-control" 
                placeholder="Optional: Override default configuration...&#10;{&#10;  &quot;baseDir&quot;: &quot;custom/path&quot;,&#10;  &quot;storageOptions&quot;: { ... }&#10;}"
                rows="6"
              ></textarea>
              <small className="form-text text-muted">
                Leave empty to use default configuration for selected workspace type
              </small>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" id="toggleAdvanced">
                <i className="bi bi-gear me-1"></i>Advanced Options
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-1"></i>Create Workspace
              </button>
            </div>
          </form>

          <div id="create-result-display" className="result-display">
            {/* Results will be displayed here */}
          </div>
        </div>
      </div>

      {/* Switch Workspace */}
      <div className="workspace-section">
        <div className="workspace-switch">
          <h2><i className="bi bi-arrow-left-right me-2"></i>Switch Workspace</h2>
          <form id="switch-workspace-form">
            <div className="form-group">
              <label htmlFor="target-workspace">Target Workspace</label>
              <select id="target-workspace" name="target-workspace" className="form-control" required>
                <option value="">Select workspace to switch to...</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="user-role">Your Role</label>
              <select id="user-role" name="user-role" className="form-control" required>
                <option value="owner">Owner - Full access</option>
                <option value="admin">Admin - Administrative access</option>
                <option value="member">Member - Read and write access</option>
                <option value="collaborator">Collaborator - Write access</option>
                <option value="viewer">Viewer - Read-only access</option>
              </select>
            </div>
            
            <button type="submit" className="btn btn-success">
              <i className="bi bi-arrow-left-right me-1"></i>Switch Workspace
            </button>
          </form>

          <div id="switch-result-display" className="result-display">
            {/* Results will be displayed here */}
          </div>
        </div>
      </div>

      {/* Permission Check */}
      <div className="workspace-section">
        <div className="workspace-permissions">
          <h2><i className="bi bi-shield-check me-2"></i>Check Permissions</h2>
          <form id="check-permissions-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="perm-workspace">Workspace</label>
                <select id="perm-workspace" name="perm-workspace" className="form-control" required>
                  <option value="">Select workspace...</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="perm-operation">Operation</label>
                <select id="perm-operation" name="perm-operation" className="form-control" required>
                  <option value="read">Read</option>
                  <option value="write">Write</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="perm-role">Role</label>
                <select id="perm-role" name="perm-role" className="form-control" required>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="collaborator">Collaborator</option>
                  <option value="viewer">Viewer</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className="btn btn-info">
              <i className="bi bi-shield-check me-1"></i>Check Permission
            </button>
          </form>

          <div id="permission-result-display" className="result-display">
            {/* Results will be displayed here */}
          </div>
        </div>
      </div>

      {/* API Documentation */}
      <div className="workspace-section">
        <div className="workspace-docs">
          <h2><i className="bi bi-book me-2"></i>API Documentation</h2>
          <p>Complete API documentation for workspace management endpoints.</p>
          <SwaggerEmbed serviceName="workspace" />
        </div>
      </div>

      {/* JavaScript for workspace functionality */}
      <script dangerouslySetInnerHTML={{
        __html: `
          // Workspace Management JavaScript
          document.addEventListener('DOMContentLoaded', function() {
            // Initialize workspace UI
            loadWorkspaces();
            loadActiveWorkspace();
            
            // Set up form handlers
            setupCreateWorkspaceForm();
            setupSwitchWorkspaceForm();
            setupPermissionCheckForm();
            setupAdvancedToggle();
            
            // Auto-refresh workspace status every 30 seconds
            setInterval(loadActiveWorkspace, 30000);
          });

          async function loadWorkspaces() {
            try {
              const response = await fetch('/api/workspaces');
              const data = await response.json();
              
              if (data.success) {
                displayWorkspaces(data.workspaces);
                populateWorkspaceDropdowns(data.workspaces);
              } else {
                showError('Failed to load workspaces: ' + data.error);
              }
            } catch (error) {
              showError('Error loading workspaces: ' + error.message);
            }
          }

          async function loadActiveWorkspace() {
            try {
              const response = await fetch('/api/workspaces/active');
              const data = await response.json();
              
              if (data.success) {
                displayActiveWorkspace(data.workspace);
                updateWorkspaceStatus('operational');
              } else {
                document.getElementById('activeWorkspaceCard').innerHTML = 
                  '<div class="workspace-info"><span class="workspace-name">No active workspace</span></div>';
                updateWorkspaceStatus('no-workspace');
              }
            } catch (error) {
              showError('Error loading active workspace: ' + error.message);
              updateWorkspaceStatus('error');
            }
          }

          function displayWorkspaces(workspaces) {
            const container = document.getElementById('workspaceList');
            
            if (workspaces.length === 0) {
              container.innerHTML = '<div class="no-workspaces">No workspaces available</div>';
              return;
            }

            const workspaceCards = workspaces.map(workspace => {
              const isActive = document.getElementById('activeWorkspaceCard')?.dataset?.workspaceId === workspace.id;
              return \`
                <div class="workspace-card \${isActive ? 'active' : ''}" data-workspace-id="\${workspace.id}">
                  <div class="workspace-header">
                    <h3>\${workspace.id}</h3>
                    <span class="workspace-type badge badge-\${workspace.type}">\${workspace.type}</span>
                  </div>
                  <div class="workspace-details">
                    <div class="detail-row">
                      <span class="label">Storage:</span>
                      <span class="value">\${workspace.storageType}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Created:</span>
                      <span class="value">\${new Date(workspace.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Last Used:</span>
                      <span class="value">\${new Date(workspace.lastAccessedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div class="workspace-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="switchToWorkspace('\${workspace.id}')">
                      <i class="bi bi-arrow-right me-1"></i>Switch
                    </button>
                    \${!['private', 'public', 'enterprise'].includes(workspace.id) ? \`
                      <button class="btn btn-sm btn-outline-danger" onclick="deleteWorkspace('\${workspace.id}')">
                        <i class="bi bi-trash me-1"></i>Delete
                      </button>
                    \` : ''}
                  </div>
                </div>
              \`;
            }).join('');

            container.innerHTML = workspaceCards;
          }

          function displayActiveWorkspace(workspace) {
            const card = document.getElementById('activeWorkspaceCard');
            card.dataset.workspaceId = workspace.id;
            
            card.innerHTML = \`
              <div class="workspace-info">
                <span class="workspace-name">\${workspace.id}</span>
                <span class="workspace-type badge badge-\${workspace.type}">\${workspace.type}</span>
                <span class="workspace-storage">Storage: \${workspace.storageType}</span>
              </div>
              <div class="workspace-permissions">
                <strong>Permissions:</strong>
                <span class="perm-list">
                  Read: \${workspace.permissions.read.join(', ')}
                  Write: \${workspace.permissions.write.join(', ')}
                  Admin: \${workspace.permissions.admin.join(', ')}
                </span>
              </div>
            \`;
          }

          function populateWorkspaceDropdowns(workspaces) {
            const dropdowns = ['target-workspace', 'perm-workspace'];
            
            dropdowns.forEach(dropdownId => {
              const dropdown = document.getElementById(dropdownId);
              const currentOptions = dropdown.innerHTML;
              const firstOption = dropdown.querySelector('option[value=""]').outerHTML;
              
              const options = workspaces.map(workspace => 
                \`<option value="\${workspace.id}">\${workspace.id} (\${workspace.type})</option>\`
              ).join('');
              
              dropdown.innerHTML = firstOption + options;
            });
          }

          function setupCreateWorkspaceForm() {
            document.getElementById('create-workspace-form').addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const formData = new FormData(e.target);
              const workspaceData = {
                workspaceId: formData.get('workspace-id'),
                workspaceType: formData.get('workspace-type')
              };
              
              const configText = formData.get('workspace-config');
              if (configText.trim()) {
                try {
                  workspaceData.config = JSON.parse(configText);
                } catch (error) {
                  showError('Invalid JSON in configuration: ' + error.message);
                  return;
                }
              }
              
              try {
                const response = await fetch('/api/workspaces', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(workspaceData)
                });
                
                const result = await response.json();
                const resultDisplay = document.getElementById('create-result-display');
                
                if (result.success) {
                  resultDisplay.innerHTML = \`
                    <div class="alert alert-success">
                      <i class="bi bi-check-circle me-2"></i>
                      Workspace "\${result.workspace.id}" created successfully!
                    </div>
                  \`;
                  e.target.reset();
                  loadWorkspaces(); // Refresh the workspace list
                } else {
                  resultDisplay.innerHTML = \`
                    <div class="alert alert-danger">
                      <i class="bi bi-exclamation-triangle me-2"></i>
                      Error: \${result.error}
                    </div>
                  \`;
                }
              } catch (error) {
                showError('Error creating workspace: ' + error.message);
              }
            });
          }

          function setupSwitchWorkspaceForm() {
            document.getElementById('switch-workspace-form').addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const formData = new FormData(e.target);
              const switchData = {
                workspaceId: formData.get('target-workspace'),
                userRole: formData.get('user-role')
              };
              
              try {
                const response = await fetch('/api/workspaces/switch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(switchData)
                });
                
                const result = await response.json();
                const resultDisplay = document.getElementById('switch-result-display');
                
                if (result.success) {
                  resultDisplay.innerHTML = \`
                    <div class="alert alert-success">
                      <i class="bi bi-check-circle me-2"></i>
                      Successfully switched to workspace "\${result.workspace.workspaceId}"
                    </div>
                  \`;
                  loadActiveWorkspace(); // Refresh active workspace display
                  loadWorkspaces(); // Refresh workspace list to update active indicator
                } else {
                  resultDisplay.innerHTML = \`
                    <div class="alert alert-danger">
                      <i class="bi bi-exclamation-triangle me-2"></i>
                      Error: \${result.error}
                    </div>
                  \`;
                }
              } catch (error) {
                showError('Error switching workspace: ' + error.message);
              }
            });
          }

          function setupPermissionCheckForm() {
            document.getElementById('check-permissions-form').addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const formData = new FormData(e.target);
              const workspaceId = formData.get('perm-workspace');
              const operation = formData.get('perm-operation');
              const userRole = formData.get('perm-role');
              
              try {
                const response = await fetch(\`/api/workspaces/\${workspaceId}/permissions/\${operation}?userRole=\${userRole}\`);
                const result = await response.json();
                const resultDisplay = document.getElementById('permission-result-display');
                
                if (result.success) {
                  const permissionStatus = result.hasPermission ? 'granted' : 'denied';
                  const alertClass = result.hasPermission ? 'alert-success' : 'alert-warning';
                  const icon = result.hasPermission ? 'bi-check-circle' : 'bi-x-circle';
                  
                  resultDisplay.innerHTML = \`
                    <div class="alert \${alertClass}">
                      <i class="bi \${icon} me-2"></i>
                      Permission <strong>\${permissionStatus}</strong> for \${userRole} to \${operation} workspace "\${workspaceId}"
                    </div>
                  \`;
                } else {
                  resultDisplay.innerHTML = \`
                    <div class="alert alert-danger">
                      <i class="bi bi-exclamation-triangle me-2"></i>
                      Error: \${result.error}
                    </div>
                  \`;
                }
              } catch (error) {
                showError('Error checking permissions: ' + error.message);
              }
            });
          }

          function setupAdvancedToggle() {
            document.getElementById('toggleAdvanced').addEventListener('click', function() {
              const advancedConfig = document.getElementById('advanced-config');
              const isVisible = advancedConfig.style.display !== 'none';
              
              advancedConfig.style.display = isVisible ? 'none' : 'block';
              this.innerHTML = isVisible ? 
                '<i class="bi bi-gear me-1"></i>Advanced Options' : 
                '<i class="bi bi-eye-slash me-1"></i>Hide Advanced';
            });
          }

          async function switchToWorkspace(workspaceId) {
            try {
              const response = await fetch('/api/workspaces/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, userRole: 'owner' })
              });
              
              const result = await response.json();
              
              if (result.success) {
                showSuccess(\`Switched to workspace "\${workspaceId}"\`);
                loadActiveWorkspace();
                loadWorkspaces();
              } else {
                showError('Error switching workspace: ' + result.error);
              }
            } catch (error) {
              showError('Error switching workspace: ' + error.message);
            }
          }

          async function deleteWorkspace(workspaceId) {
            if (!confirm(\`Are you sure you want to delete workspace "\${workspaceId}"? This action cannot be undone.\`)) {
              return;
            }
            
            try {
              const response = await fetch(\`/api/workspaces/\${workspaceId}\`, {
                method: 'DELETE'
              });
              
              const result = await response.json();
              
              if (result.success) {
                showSuccess(\`Workspace "\${workspaceId}" deleted successfully\`);
                loadWorkspaces();
                loadActiveWorkspace(); // Refresh in case deleted workspace was active
              } else {
                showError('Error deleting workspace: ' + result.error);
              }
            } catch (error) {
              showError('Error deleting workspace: ' + error.message);
            }
          }

          function updateWorkspaceStatus(status) {
            const statusIndicator = document.getElementById('workspace-status');
            statusIndicator.className = 'status-indicator status-' + status;
          }

          function showError(message) {
            // You can implement a toast notification system here
            console.error(message);
            alert('Error: ' + message);
          }

          function showSuccess(message) {
            // You can implement a toast notification system here
            console.log(message);
            alert('Success: ' + message);
          }
        `
      }} />

      <style dangerouslySetInnerHTML={{
        __html: `
          .workspace-section {
            margin-bottom: 2rem;
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .workspace-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
          }

          .workspace-card {
            border: 1px solid #e0e6ed;
            border-radius: 6px;
            padding: 1rem;
            background: #fafbfc;
            transition: all 0.2s ease;
          }

          .workspace-card:hover {
            border-color: #0052cc;
            background: #f4f5f7;
          }

          .workspace-card.active {
            border-color: #36b37e;
            background: #e3fcef;
          }

          .workspace-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 0.5rem;
          }

          .workspace-header h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
          }

          .workspace-type.badge {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
          }

          .badge-private { background: #6554c0; color: white; }
          .badge-public { background: #00a3bf; color: white; }
          .badge-enterprise { background: #ff5630; color: white; }

          .workspace-details {
            margin-bottom: 1rem;
          }

          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.25rem;
            font-size: 0.875rem;
          }

          .detail-row .label {
            font-weight: 500;
            color: #6b778c;
          }

          .workspace-actions {
            display: flex;
            gap: 0.5rem;
          }

          .current-workspace-display {
            margin-top: 1rem;
          }

          .current-workspace-display .workspace-card {
            background: #e3fcef;
            border-color: #36b37e;
          }

          .workspace-permissions {
            margin-top: 0.5rem;
            font-size: 0.875rem;
            color: #6b778c;
          }

          .perm-list {
            display: block;
            margin-top: 0.25rem;
            font-family: monospace;
            font-size: 0.8rem;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 1rem;
          }

          .form-actions {
            display: flex;
            gap: 1rem;
            align-items: center;
          }

          .result-display {
            margin-top: 1rem;
          }

          .alert {
            padding: 0.75rem 1rem;
            border-radius: 4px;
            border: 1px solid transparent;
          }

          .alert-success {
            color: #155724;
            background-color: #d4edda;
            border-color: #c3e6cb;
          }

          .alert-danger {
            color: #721c24;
            background-color: #f8d7da;
            border-color: #f5c6cb;
          }

          .alert-warning {
            color: #856404;
            background-color: #fff3cd;
            border-color: #ffeaa7;
          }

          .loading-state {
            text-align: center;
            color: #6b778c;
            padding: 2rem;
          }

          .no-workspaces {
            text-align: center;
            color: #6b778c;
            padding: 2rem;
            font-style: italic;
          }

          .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-left: 0.5rem;
          }

          .status-operational { background-color: #36b37e; }
          .status-error { background-color: #ff5630; }
          .status-no-workspace { background-color: #ffab00; }
        `
      }} />
    </>
  );
};

export default Workspace;