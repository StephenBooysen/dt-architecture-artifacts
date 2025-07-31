import React from 'react';

const Caching = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-database-check"></i>
          Caching Service
          <div className="status-indicator" id="caching-status"></div>
        </h1>
        <p>Interact with the application caching service</p>
      </div>

      <div className="caching-section">
        <div className="caching-form">
          <h2>Cache Operations</h2>
          
          <div className="form-group">
            <label htmlFor="cacheKey">Cache Key:</label>
            <input type="text" id="cacheKey" className="form-control" placeholder="Enter cache key..." required />
          </div>
          
          <div className="form-group">
            <label htmlFor="cacheValue">Cache Value (JSON format required for PUT operation):</label>
            <textarea 
              id="cacheValue" 
              className="form-control" 
              placeholder="Enter your JSON value...&#10;{&#10;  &quot;data&quot;: &quot;your cached data here&quot;,&#10;  &quot;timestamp&quot;: &quot;2024-01-01T00:00:00Z&quot;,&#10;  &quot;metadata&quot;: {}&#10;}"
            ></textarea>
            <div className="json-validation-feedback" id="jsonValidation"></div>
          </div>
          
          <div className="form-group" id="jsonPreviewGroup" style={{display: 'none'}}>
            <label>Formatted JSON Preview:</label>
            <pre className="json-preview" id="jsonPreview"></pre>
          </div>
          
          <div className="cache-operations">
            <button type="button" className="btn btn-success" id="putButton" disabled>
              <i className="bi bi-plus-circle me-2"></i>PUT
            </button>
            <button type="button" className="btn btn-primary" id="getButton">
              <i className="bi bi-search me-2"></i>GET
            </button>
            <button type="button" className="btn btn-danger" id="deleteButton">
              <i className="bi bi-trash me-2"></i>DELETE
            </button>
          </div>
        </div>
      </div>

      <div className="cache-result" id="cacheResult" style={{display: 'none'}}>
        <h3>Result</h3>
        <pre id="resultContent"></pre>
      </div>

      {/* Toast container for Bootstrap notifications */}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{zIndex: 1100}}>
        <div id="cacheToast" className="toast" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <svg className="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
            <strong className="me-auto" id="toastTitle">Caching Service</strong>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div className="toast-body" id="toastMessage">
            {/* Toast message will be inserted here */}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .caching-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .caching-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .caching-form h2 {
          color: #172b4d;
          font-size: 1.25rem;
          font-weight: 600;
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
          min-height: 100px;
        }
        .content-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #172b4d;
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
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
        .cache-operations {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
          margin-top: 1rem;
        }
        .cache-result {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          min-height: 120px;
        }
        .cache-result h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .cache-result pre {
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
        @media (max-width: 768px) {
          .cache-operations {
            grid-template-columns: 1fr;
          }
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
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        let isValidJson = false;

        // JSON validation and formatting function
        function validateAndFormatJson(jsonString) {
          const valueField = document.getElementById('cacheValue');
          const validationFeedback = document.getElementById('jsonValidation');
          const previewGroup = document.getElementById('jsonPreviewGroup');
          const previewElement = document.getElementById('jsonPreview');
          const putButton = document.getElementById('putButton');
          
          try {
            if (!jsonString.trim()) {
              // Empty input
              valueField.classList.remove('valid', 'invalid');
              validationFeedback.textContent = '';
              validationFeedback.className = 'json-validation-feedback';
              previewGroup.style.display = 'none';
              isValidJson = false;
              putButton.disabled = true;
              return;
            }
            
            // Try to parse JSON
            const parsed = JSON.parse(jsonString);
            
            // Valid JSON
            valueField.classList.remove('invalid');
            valueField.classList.add('valid');
            validationFeedback.textContent = '✓ Valid JSON';
            validationFeedback.className = 'json-validation-feedback valid';
            
            // Show formatted preview
            const formatted = JSON.stringify(parsed, null, 2);
            previewElement.textContent = formatted;
            previewGroup.style.display = 'block';
            
            isValidJson = true;
            putButton.disabled = false;
            
          } catch (error) {
            // Invalid JSON
            valueField.classList.remove('valid');
            valueField.classList.add('invalid');
            validationFeedback.textContent = '✗ Invalid JSON: ' + error.message;
            validationFeedback.className = 'json-validation-feedback invalid';
            previewGroup.style.display = 'none';
            
            isValidJson = false;
            putButton.disabled = true;
          }
        }

        // Check service status on page load
        async function checkServiceStatus() {
          try {
            const response = await fetch('/api/caching/status');
            const statusIndicator = document.getElementById('caching-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Caching service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Caching service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('caching-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Caching service is offline';
          }
        }

        // Show toast notification
        function showToast(message, isError = false) {
          const toast = new bootstrap.Toast(document.getElementById('cacheToast'));
          document.getElementById('toastMessage').textContent = message;
          document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
          toast.show();
        }

        // Show result in result panel
        function showResult(content, title = 'Result') {
          const resultPanel = document.getElementById('cacheResult');
          const resultContent = document.getElementById('resultContent');
          
          resultContent.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
          resultPanel.style.display = 'block';
          
          // Scroll to result
          resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // PUT operation
        document.getElementById('putButton').addEventListener('click', async function() {
          const key = document.getElementById('cacheKey').value.trim();
          const value = document.getElementById('cacheValue').value.trim();
          
          if (!key) {
            showToast('Please enter a cache key', true);
            return;
          }
          
          if (!value) {
            showToast('Please enter a value to cache', true);
            return;
          }
          
          if (!isValidJson) {
            showToast('Please enter a valid JSON value', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Putting...';
            
            const response = await fetch(\`/api/caching/put/\${encodeURIComponent(key)}\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: value
            });
            
            if (response.ok) {
              const result = await response.text();
              showToast('Value cached successfully');
              showResult(\`Key "\${key}" cached successfully\`);
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to cache value: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-plus-circle me-2"></i>PUT';
          }
        });

        // GET operation
        document.getElementById('getButton').addEventListener('click', async function() {
          const key = document.getElementById('cacheKey').value.trim();
          
          if (!key) {
            showToast('Please enter a cache key', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Getting...';
            
            const response = await fetch(\`/api/caching/get/\${encodeURIComponent(key)}\`);
            
            if (response.ok) {
              const result = await response.json();
              showToast('Value retrieved successfully');
              showResult(result !== null ? result : 'Key not found or value is null');
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to get value: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-search me-2"></i>GET';
          }
        });

        // DELETE operation
        document.getElementById('deleteButton').addEventListener('click', async function() {
          const key = document.getElementById('cacheKey').value.trim();
          
          if (!key) {
            showToast('Please enter a cache key', true);
            return;
          }
          
          if (!confirm(\`Are you sure you want to delete the cache entry for key "\${key}"?\`)) {
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Deleting...';
            
            const response = await fetch(\`/api/caching/delete/\${encodeURIComponent(key)}\`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              const result = await response.text();
              showToast('Value deleted successfully');
              showResult(\`Key "\${key}" deleted successfully\`);
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to delete value: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-trash me-2"></i>DELETE';
          }
        });

        // Add event listener for JSON validation
        document.getElementById('cacheValue').addEventListener('input', function(e) {
          validateAndFormatJson(e.target.value);
        });
        
        // Add event listener for paste events to handle JSON formatting
        document.getElementById('cacheValue').addEventListener('paste', function(e) {
          // Use setTimeout to allow paste to complete before validation
          setTimeout(() => {
            validateAndFormatJson(e.target.value);
          }, 10);
        });

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
          // Check status periodically
          checkServiceStatus();
          setInterval(checkServiceStatus, 30000); // Check every 30 seconds
        });
      `}} />
    </>
  );
};

export default Caching;