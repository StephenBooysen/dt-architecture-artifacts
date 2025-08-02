import React from 'react';

const Spaces = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-collection"></i>
          Spaces Management
          <div className="status-indicator" id="spaces-status"></div>
        </h1>
        <div className="header-actions">
          <p>Manage content spaces and filing configurations</p>
        </div>
      </div>

      <div className="spaces-section">
        <div className="spaces-list">
          <h2>Existing Spaces</h2>
          <div id="spacesContainer">
            {/* Spaces will be loaded here */}
          </div>
        </div>
      </div>

      <div className="space-form-section">
        <div className="space-form">
          <h2>Add/Edit Space</h2>
          
          <div className="form-group">
            <label htmlFor="spaceName">Space Name:</label>
            <input type="text" id="spaceName" className="form-control" placeholder="Enter space name..." required />
          </div>
          
          <div className="form-group">
            <label htmlFor="spaceAccess">Access Level:</label>
            <select id="spaceAccess" className="form-control" required>
              <option value="">Select access level...</option>
              <option value="write">Write</option>
              <option value="readonly">Read Only</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="filingConfig">Filing Configuration (JSON format):</label>
            <textarea 
              id="filingConfig" 
              className="form-control" 
              placeholder="Enter filing configuration...&#10;Example for local:&#10;{&#10;  &quot;type&quot;: &quot;local&quot;,&#10;  &quot;localFolder&quot;: &quot;./content&quot;&#10;}&#10;&#10;Example for git:&#10;{&#10;  &quot;type&quot;: &quot;git&quot;,&#10;  &quot;localFolder&quot;: &quot;./content-shared&quot;,&#10;  &quot;git&quot;: &quot;https://github.com/user/repo.git&quot;,&#10;  &quot;git-branch&quot;: &quot;main&quot;,&#10;  &quot;git-fetch-interval&quot;: &quot;5000&quot;&#10;}"
            ></textarea>
            <div className="json-validation-feedback" id="jsonValidation"></div>
          </div>
          
          <div className="form-group" id="jsonPreviewGroup" style={{display: 'none'}}>
            <label>Formatted JSON Preview:</label>
            <pre className="json-preview" id="jsonPreview"></pre>
          </div>
          
          <div className="space-operations">
            <button type="button" className="btn btn-success" id="saveButton" disabled>
              <i className="bi bi-check-circle me-2"></i>Save Space
            </button>
            <button type="button" className="btn btn-secondary" id="clearButton">
              <i className="bi bi-x-circle me-2"></i>Clear Form
            </button>
          </div>
        </div>
      </div>

      <div className="spaces-result" id="spacesResult" style={{display: 'none'}}>
        <h3>Result</h3>
        <pre id="resultContent"></pre>
      </div>

      {/* Toast container for Bootstrap notifications */}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{zIndex: 1100}}>
        <div id="spacesToast" className="toast" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <svg className="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
            <strong className="me-auto" id="toastTitle">Spaces Management</strong>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div className="toast-body" id="toastMessage">
            {/* Toast message will be inserted here */}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .spaces-section {
          margin-bottom: 2rem;
        }
        .space-form-section {
          margin-bottom: 2rem;
        }
        .spaces-list, .space-form {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .spaces-list h2, .space-form h2 {
          color: #172b4d;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          padding: 1.5rem 2rem 0;
        }
        .space-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #172b4d;
        }
        .form-control {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #dfe1e6;
          border-radius: 4px;
          background: #ffffff;
          color: #172b4d;
          font-size: 14px;
        }
        .form-control:focus {
          outline: none;
          border-color: #0052cc;
          box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
        }
        textarea.form-control {
          resize: vertical;
          min-height: 120px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        .content-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #172b4d;
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .header-actions p {
          margin: 0;
          color: #5e6c84;
        }
        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #36b37e;
          box-shadow: 0 0 0 3px rgba(54, 179, 126, 0.3);
          animation: pulse 2s infinite;
        }
        .status-indicator.offline {
          background: #de350b;
          box-shadow: 0 0 0 3px rgba(222, 53, 11, 0.3);
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        .space-operations {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        .spaces-result {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          min-height: 120px;
        }
        .spaces-result h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .spaces-result pre {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 4px;
          padding: 1rem;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 0.875rem;
          color: #172b4d;
          max-height: 200px;
          overflow-y: auto;
        }
        .json-validation-feedback {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          min-height: 1.25rem;
        }
        .json-validation-feedback.valid {
          color: #36b37e;
        }
        .json-validation-feedback.invalid {
          color: #de350b;
        }
        .json-preview {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 4px;
          padding: 1rem;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 0.875rem;
          color: #172b4d;
          max-height: 300px;
          overflow-y: auto;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        .form-control.valid {
          border-color: #36b37e;
          box-shadow: 0 0 0 2px rgba(54, 179, 126, 0.2);
        }
        .form-control.invalid {
          border-color: #de350b;
          box-shadow: 0 0 0 2px rgba(222, 53, 11, 0.2);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .space-item {
          border: 1px solid #dfe1e6;
          border-radius: 6px;
          margin-bottom: 1rem;
          background: #ffffff;
          overflow: hidden;
        }
        .space-header {
          padding: 1rem 1.5rem;
          background: #f8f9fa;
          border-bottom: 1px solid #dfe1e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .space-name {
          font-weight: 600;
          color: #172b4d;
        }
        .space-access {
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }
        .space-access.write {
          background: #e3fcef;
          color: #006644;
        }
        .space-access.readonly {
          background: #fff4e6;
          color: #974f0c;
        }
        .space-body {
          padding: 1rem 1.5rem;
        }
        .space-config {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 4px;
          padding: 0.75rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.75rem;
          color: #5e6c84;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 100px;
          overflow-y: auto;
          margin-bottom: 1rem;
        }
        .space-actions {
          display: flex;
          gap: 0.5rem;
        }
        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }
        @media (max-width: 768px) {
          .space-operations {
            flex-direction: column;
          }
        }
        #spacesContainer {
          padding: 0 2rem 2rem;
        }
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        let isValidJson = false;
        let editingSpaceIndex = -1;
        let spaces = [];

        // Load spaces from server
        async function loadSpaces() {
          try {
            const response = await fetch('/api/spaces');
            if (response.ok) {
              spaces = await response.json();
              renderSpaces();
            } else {
              console.error('Failed to load spaces');
            }
          } catch (error) {
            console.error('Error loading spaces:', error);
          }
        }

        // Render spaces list
        function renderSpaces() {
          const container = document.getElementById('spacesContainer');
          
          if (spaces.length === 0) {
            container.innerHTML = '<p style="color: #5e6c84; text-align: center; padding: 2rem;">No spaces configured yet.</p>';
            return;
          }
          
          container.innerHTML = spaces.map((space, index) => \`
            <div class="space-item">
              <div class="space-header">
                <span class="space-name">\${space.space}</span>
                <span class="space-access \${space.access}">\${space.access}</span>
              </div>
              <div class="space-body">
                <div class="space-config">\${JSON.stringify(space.filing, null, 2)}</div>
                <div class="space-actions">
                  <button type="button" class="btn btn-primary btn-sm" onclick="editSpace(\${index})">
                    <i class="bi bi-pencil me-1"></i>Edit
                  </button>
                  <button type="button" class="btn btn-danger btn-sm" onclick="deleteSpace(\${index})">
                    <i class="bi bi-trash me-1"></i>Delete
                  </button>
                </div>
              </div>
            </div>
          \`).join('');
        }

        // Edit space
        function editSpace(index) {
          editingSpaceIndex = index;
          const space = spaces[index];
          
          document.getElementById('spaceName').value = space.space;
          document.getElementById('spaceAccess').value = space.access;
          document.getElementById('filingConfig').value = JSON.stringify(space.filing, null, 2);
          
          validateAndFormatJson(document.getElementById('filingConfig').value);
          
          // Update button text
          document.getElementById('saveButton').innerHTML = '<i class="bi bi-check-circle me-2"></i>Update Space';
          
          // Scroll to form
          document.querySelector('.space-form').scrollIntoView({ behavior: 'smooth' });
        }

        // Delete space
        async function deleteSpace(index) {
          const space = spaces[index];
          
          if (!confirm(\`Are you sure you want to delete the space "\${space.space}"?\`)) {
            return;
          }
          
          try {
            const response = await fetch(\`/api/spaces/\${index}\`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              showToast('Space deleted successfully');
              loadSpaces();
              clearForm();
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to delete space: ' + error.message, true);
          }
        }

        // Clear form
        function clearForm() {
          document.getElementById('spaceName').value = '';
          document.getElementById('spaceAccess').value = '';
          document.getElementById('filingConfig').value = '';
          document.getElementById('jsonValidation').textContent = '';
          document.getElementById('jsonValidation').className = 'json-validation-feedback';
          document.getElementById('jsonPreviewGroup').style.display = 'none';
          document.getElementById('filingConfig').classList.remove('valid', 'invalid');
          
          editingSpaceIndex = -1;
          isValidJson = false;
          document.getElementById('saveButton').disabled = true;
          document.getElementById('saveButton').innerHTML = '<i class="bi bi-check-circle me-2"></i>Save Space';
        }

        // JSON validation and formatting function
        function validateAndFormatJson(jsonString) {
          const valueField = document.getElementById('filingConfig');
          const validationFeedback = document.getElementById('jsonValidation');
          const previewGroup = document.getElementById('jsonPreviewGroup');
          const previewElement = document.getElementById('jsonPreview');
          const saveButton = document.getElementById('saveButton');
          
          try {
            if (!jsonString.trim()) {
              valueField.classList.remove('valid', 'invalid');
              validationFeedback.textContent = '';
              validationFeedback.className = 'json-validation-feedback';
              previewGroup.style.display = 'none';
              isValidJson = false;
              updateSaveButton();
              return;
            }
            
            const parsed = JSON.parse(jsonString);
            
            // Validate required fields
            if (!parsed.type) {
              throw new Error('Missing required field: type');
            }
            
            if (parsed.type === 'local' && !parsed.localFolder) {
              throw new Error('Local type requires localFolder field');
            }
            
            if (parsed.type === 'git') {
              if (!parsed.localFolder) throw new Error('Git type requires localFolder field');
              if (!parsed.git) throw new Error('Git type requires git field');
              if (!parsed['git-branch']) throw new Error('Git type requires git-branch field');
            }
            
            valueField.classList.remove('invalid');
            valueField.classList.add('valid');
            validationFeedback.textContent = '✓ Valid filing configuration';
            validationFeedback.className = 'json-validation-feedback valid';
            
            const formatted = JSON.stringify(parsed, null, 2);
            previewElement.textContent = formatted;
            previewGroup.style.display = 'block';
            
            isValidJson = true;
            updateSaveButton();
            
          } catch (error) {
            valueField.classList.remove('valid');
            valueField.classList.add('invalid');
            validationFeedback.textContent = '✗ Invalid configuration: ' + error.message;
            validationFeedback.className = 'json-validation-feedback invalid';
            previewGroup.style.display = 'none';
            
            isValidJson = false;
            updateSaveButton();
          }
        }

        // Update save button state
        function updateSaveButton() {
          const spaceName = document.getElementById('spaceName').value.trim();
          const spaceAccess = document.getElementById('spaceAccess').value;
          const saveButton = document.getElementById('saveButton');
          
          const isValid = spaceName && spaceAccess && isValidJson;
          saveButton.disabled = !isValid;
        }

        // Show toast notification
        function showToast(message, isError = false) {
          const toast = new bootstrap.Toast(document.getElementById('spacesToast'));
          document.getElementById('toastMessage').textContent = message;
          document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
          toast.show();
        }

        // Show result in result panel
        function showResult(content, title = 'Result') {
          const resultPanel = document.getElementById('spacesResult');
          const resultContent = document.getElementById('resultContent');
          
          resultContent.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
          resultPanel.style.display = 'block';
          
          resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Save space
        async function saveSpace() {
          const spaceName = document.getElementById('spaceName').value.trim();
          const spaceAccess = document.getElementById('spaceAccess').value;
          const filingConfig = document.getElementById('filingConfig').value.trim();
          
          if (!spaceName || !spaceAccess || !isValidJson) {
            showToast('Please fill all fields with valid data', true);
            return;
          }
          
          try {
            const saveButton = document.getElementById('saveButton');
            saveButton.disabled = true;
            const originalText = saveButton.innerHTML;
            saveButton.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Saving...';
            
            const spaceData = {
              space: spaceName,
              access: spaceAccess,
              filing: JSON.parse(filingConfig)
            };
            
            const url = editingSpaceIndex >= 0 ? \`/api/spaces/\${editingSpaceIndex}\` : '/api/spaces';
            const method = editingSpaceIndex >= 0 ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
              method: method,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(spaceData)
            });
            
            if (response.ok) {
              const result = await response.json();
              showToast(\`Space \${editingSpaceIndex >= 0 ? 'updated' : 'created'} successfully\`);
              showResult(result);
              loadSpaces();
              clearForm();
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to save space: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            const saveButton = document.getElementById('saveButton');
            saveButton.disabled = false;
            saveButton.innerHTML = editingSpaceIndex >= 0 ? '<i class="bi bi-check-circle me-2"></i>Update Space' : '<i class="bi bi-check-circle me-2"></i>Save Space';
          }
        }

        // Event listeners
        document.getElementById('saveButton').addEventListener('click', saveSpace);
        document.getElementById('clearButton').addEventListener('click', clearForm);

        // Form validation event listeners
        document.getElementById('spaceName').addEventListener('input', updateSaveButton);
        document.getElementById('spaceAccess').addEventListener('change', updateSaveButton);
        document.getElementById('filingConfig').addEventListener('input', function(e) {
          validateAndFormatJson(e.target.value);
        });
        
        document.getElementById('filingConfig').addEventListener('paste', function(e) {
          setTimeout(() => {
            validateAndFormatJson(e.target.value);
          }, 10);
        });

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
          loadSpaces();
          
          // Set status as online (spaces management is always available)
          const statusIndicator = document.getElementById('spaces-status');
          statusIndicator.classList.remove('offline');
          statusIndicator.title = 'Spaces management is active';
        });
      `}} />
    </>
  );
};

export default Spaces;