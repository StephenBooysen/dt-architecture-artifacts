import React from 'react';
import SwaggerEmbed from '../shared/SwaggerEmbed';

const Searching = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-search"></i>
          Search Service
          <div className="status-indicator" id="search-status"></div>
        </h1>
        <div className="header-actions">
          <p>Add JSON data to collections and perform text-based searches</p>
        </div>
      </div>

      {/* Add Data Section */}
      <div className="search-section">
        <div className="search-form">
          <h2><i className="bi bi-plus-circle me-2"></i>Add JSON Data</h2>
            <form id="add-data-form">
              <div className="form-group">
                <label htmlFor="json-data">JSON Data (JSON format required)</label>
                <textarea 
                  id="json-data" 
                  name="json-data" 
                  className="form-control textarea-control" 
                  placeholder="Enter your JSON data...&#10;{&#10;  &quot;name&quot;: &quot;John Doe&quot;,&#10;  &quot;email&quot;: &quot;john@example.com&quot;,&#10;  &quot;role&quot;: &quot;developer&quot;&#10;}"
                  required
                ></textarea>
                <div className="json-validation-feedback" id="jsonValidation"></div>
                <div className="search-examples">
                  <strong>Example JSON Data:</strong>
                  <pre>{`{"user": {"name": "Alice Smith", "department": "Engineering", "skills": ["JavaScript", "Python", "React"]}, "project": "Web Application", "status": "active"}`}</pre>
                  <strong>Note:</strong> A unique key will be automatically generated for this data.
                </div>
              </div>
              
              <div className="form-group" id="jsonPreviewGroup" style={{display: 'none'}}>
                <label>Formatted JSON Preview:</label>
                <pre className="json-preview" id="jsonPreview"></pre>
              </div>
              
              <button type="submit" className="btn btn-success" id="addDataButton" disabled>
                <i className="bi bi-plus-circle me-1"></i>Add Data
              </button>
            </form>

          <div id="add-result-display" className="result-display">
            <h4>Add Result:</h4>
            <pre id="add-result-content"></pre>
          </div>
        </div>
      </div>

      {/* Search Data Section */}
      <div className="search-section">
        <div className="search-form">
          <h2><i className="bi bi-search me-2"></i>Search JSON Data</h2>
            <form id="search-data-form">
              <div className="form-group">
                <label htmlFor="search-term">Search Term</label>
                <input 
                  type="text" 
                  id="search-term" 
                  name="search-term" 
                  className="form-control" 
                  placeholder="Enter search term (e.g., 'developer', 'active', 'JavaScript')"
                  required
                />
                <div className="search-examples">
                  <strong>Search Examples:</strong>
                  <ul>
                    <li><code>developer</code> - Find all data containing "developer"</li>
                    <li><code>JavaScript</code> - Find all data mentioning "JavaScript"</li>
                    <li><code>alice</code> - Case-insensitive search for "alice"</li>
                  </ul>
                  <strong>Note:</strong> Search is case-insensitive and searches all string values in nested objects.
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-search me-1"></i>Search
              </button>
            </form>

          <div id="search-result-display" className="result-display">
            <h4>Search Results:</h4>
            <div id="search-results-container">
              <div className="no-results">No search performed yet</div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Data Section */}
      <div className="search-section">
        <div className="search-form">
          <h2><i className="bi bi-trash me-2"></i>Delete JSON Data</h2>
            <form id="delete-data-form">
              <div className="form-group">
                <label htmlFor="delete-key">Data Key</label>
                <div className="delete-key-input">
                  <input 
                    type="text" 
                    id="delete-key" 
                    name="delete-key" 
                    className="form-control" 
                    placeholder="Enter the UUID key of the data to delete"
                    required
                  />
                  <button type="submit" className="btn btn-danger">
                    <i className="bi bi-trash me-1"></i>Delete
                  </button>
                </div>
                <div className="search-examples">
                  <strong>Key Format:</strong> UUID (e.g., <code>a1b2c3d4-e5f6-7890-ab12-cd34ef567890</code>)
                  <br/><strong>Note:</strong> You can get keys from search results or when adding data.
                </div>
              </div>
            </form>

          <div id="delete-result-display" className="result-display">
            <h4>Delete Result:</h4>
            <pre id="delete-result-content"></pre>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .search-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .search-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .search-form h2 {
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
        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-block;
          text-align: center;
        }
        .btn-primary {
          background: #0052cc;
          color: #ffffff;
          margin-right: 1rem;
        }
        .btn-primary:hover {
          background: #0065ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 82, 204, 0.3);
        }
        .btn-success {
          background: #36b37e;
          color: #ffffff;
          margin-right: 1rem;
        }
        .btn-success:hover {
          background: #57d9a3;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(54, 179, 126, 0.3);
        }
        .btn-danger {
          background: #de350b;
          color: #ffffff;
        }
        .btn-danger:hover {
          background: #ff5630;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(222, 53, 11, 0.3);
        }
        .result-display {
          margin-top: 2rem;
          padding: 1rem;
          background: #f4f5f7;
          border-radius: 4px;
          border-left: 4px solid #0052cc;
          display: none;
        }
        .result-display.error {
          border-left-color: #de350b;
          background: #ffebe6;
        }
        .result-display.success {
          border-left-color: #36b37e;
          background: #e3fcef;
        }
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 4px;
          padding: 1rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          transform: translateX(400px);
          opacity: 0;
          transition: all 0.3s ease;
        }
        .toast.show {
          transform: translateX(0);
          opacity: 1;
        }
        .toast.success {
          border-left: 4px solid #36b37e;
        }
        .toast.error {
          border-left: 4px solid #de350b;
        }
        .textarea-control {
          min-height: 120px;
          resize: vertical;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        .search-examples {
          background: #f4f5f7;
          padding: 1rem;
          border-radius: 4px;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #5e6c84;
        }
        .search-examples ul {
          margin: 0;
          padding-left: 1.5rem;
        }
        .search-examples pre {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 4px;
          padding: 0.75rem;
          margin: 0.5rem 0;
          overflow-x: auto;
        }
        .section-divider {
          border-top: 1px solid #dfe1e6;
          margin: 2rem 0;
          padding-top: 2rem;
        }
        .search-results {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #dfe1e6;
          border-radius: 4px;
          background: #ffffff;
        }
        .search-result-item {
          padding: 1rem;
          border-bottom: 1px solid #f4f5f7;
        }
        .search-result-item:last-child {
          border-bottom: none;
        }
        .search-result-key {
          font-weight: 600;
          color: #0052cc;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        .search-result-data {
          background: #f8f9fa;
          border-radius: 4px;
          padding: 0.75rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
          white-space: pre-wrap;
          overflow-x: auto;
        }
        .no-results {
          text-align: center;
          padding: 2rem;
          color: #5e6c84;
          font-style: italic;
        }
        .delete-key-input {
          display: flex;
          gap: 0.5rem;
          align-items: end;
        }
        .delete-key-input .form-control {
          flex: 1;
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
        let statusCheckInterval;
        let isValidJson = false;

        // JSON validation and formatting function
        function validateAndFormatJson(jsonString) {
          const dataField = document.getElementById('json-data');
          const validationFeedback = document.getElementById('jsonValidation');
          const previewGroup = document.getElementById('jsonPreviewGroup');
          const previewElement = document.getElementById('jsonPreview');
          const addButton = document.getElementById('addDataButton');
          
          try {
            if (!jsonString.trim()) {
              // Empty input
              dataField.classList.remove('valid', 'invalid');
              validationFeedback.textContent = '';
              validationFeedback.className = 'json-validation-feedback';
              previewGroup.style.display = 'none';
              isValidJson = false;
              addButton.disabled = true;
              return;
            }
            
            // Try to parse JSON
            const parsed = JSON.parse(jsonString);
            
            // Valid JSON
            dataField.classList.remove('invalid');
            dataField.classList.add('valid');
            validationFeedback.textContent = '✓ Valid JSON';
            validationFeedback.className = 'json-validation-feedback valid';
            
            // Show formatted preview
            const formatted = JSON.stringify(parsed, null, 2);
            previewElement.textContent = formatted;
            previewGroup.style.display = 'block';
            
            isValidJson = true;
            addButton.disabled = false;
            
          } catch (error) {
            // Invalid JSON
            dataField.classList.remove('valid');
            dataField.classList.add('invalid');
            validationFeedback.textContent = '✗ Invalid JSON: ' + error.message;
            validationFeedback.className = 'json-validation-feedback invalid';
            previewGroup.style.display = 'none';
            
            isValidJson = false;
            addButton.disabled = true;
          }
        }

        // Check service status
        async function checkSearchStatus() {
          try {
            const response = await fetch('/api/searching/status');
            const statusIndicator = document.getElementById('search-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Search service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Search service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('search-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Search service is offline';
          }
        }

        // Show toast notification
        function showToast(message, type = 'success') {
          const toast = document.createElement('div');
          toast.className = \`toast \${type}\`;
          toast.innerHTML = \`
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <i class="bi bi-\${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
              <span>\${message}</span>
            </div>
          \`;
          
          document.body.appendChild(toast);
          
          setTimeout(() => toast.classList.add('show'), 100);
          setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
          }, 3000);
        }

        // Add JSON data
        document.getElementById('add-data-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const jsonDataText = document.getElementById('json-data').value.trim();
          const resultDisplay = document.getElementById('add-result-display');
          const resultContent = document.getElementById('add-result-content');
          
          if (!jsonDataText) {
            showToast('JSON data is required', 'error');
            return;
          }
          
          if (!isValidJson) {
            showToast('Please enter valid JSON data', 'error');
            return;
          }

          let jsonData;
          try {
            jsonData = JSON.parse(jsonDataText);
          } catch (error) {
            showToast('Invalid JSON format', 'error');
            return;
          }

          try {
            const response = await fetch('/api/searching/add/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(jsonData),
            });

            const result = await response.text();
            
            if (response.ok) {
              resultDisplay.className = 'result-display success';
              resultContent.textContent = 'Data added successfully! A unique key has been generated.';
              showToast('JSON data added successfully', 'success');
              document.getElementById('json-data').value = '';
              validateAndFormatJson(''); // Reset validation state
            } else {
              resultDisplay.className = 'result-display error';
              resultContent.textContent = result || 'Failed to add data';
              showToast('Failed to add data', 'error');
            }
            
            resultDisplay.style.display = 'block';
          } catch (error) {
            resultDisplay.className = 'result-display error';
            resultContent.textContent = 'Error: ' + error.message;
            resultDisplay.style.display = 'block';
            showToast('Error adding data', 'error');
          }
        });

        // Search JSON data
        document.getElementById('search-data-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const searchTerm = document.getElementById('search-term').value.trim();
          const resultDisplay = document.getElementById('search-result-display');
          const resultsContainer = document.getElementById('search-results-container');
          
          if (!searchTerm) {
            showToast('Search term is required', 'error');
            return;
          }

          try {
            const response = await fetch(\`/api/searching/search/\${encodeURIComponent(searchTerm)}\`);
            
            if (response.ok) {
              const results = await response.json();
              
              resultDisplay.className = 'result-display success';
              
              if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="no-results">No results found for your search term.</div>';
              } else {
                // Results come as alternating key-object pairs
                let resultsHtml = '<div class="search-results">';
                for (let i = 0; i < results.length; i += 2) {
                  const key = results[i];
                  const data = results[i + 1];
                  resultsHtml += \`
                    <div class="search-result-item">
                      <div class="search-result-key">Key: \${key}</div>
                      <div class="search-result-data">\${JSON.stringify(data, null, 2)}</div>
                    </div>
                  \`;
                }
                resultsHtml += '</div>';
                resultsContainer.innerHTML = resultsHtml;
              }
              
              showToast(\`Found \${Math.floor(results.length / 2)} result(s)\`, 'success');
            } else {
              const error = await response.text();
              resultDisplay.className = 'result-display error';
              resultsContainer.innerHTML = '<div class="no-results">Error performing search</div>';
              showToast('Search failed', 'error');
            }
            
            resultDisplay.style.display = 'block';
          } catch (error) {
            resultDisplay.className = 'result-display error';
            resultsContainer.innerHTML = '<div class="no-results">Error performing search</div>';
            resultDisplay.style.display = 'block';
            showToast('Error performing search', 'error');
          }
        });

        // Delete JSON data
        document.getElementById('delete-data-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const deleteKey = document.getElementById('delete-key').value.trim();
          const resultDisplay = document.getElementById('delete-result-display');
          const resultContent = document.getElementById('delete-result-content');
          
          if (!deleteKey) {
            showToast('Data key is required', 'error');
            return;
          }

          try {
            const response = await fetch(\`/api/searching/delete/\${encodeURIComponent(deleteKey)}\`, {
              method: 'DELETE',
            });

            const result = await response.text();
            
            if (response.ok) {
              resultDisplay.className = 'result-display success';
              resultContent.textContent = 'Data deleted successfully!';
              showToast('Data deleted successfully', 'success');
              document.getElementById('delete-key').value = '';
            } else if (response.status === 404) {
              resultDisplay.className = 'result-display error';
              resultContent.textContent = 'Key not found. Please check the key and try again.';
              showToast('Key not found', 'error');
            } else {
              resultDisplay.className = 'result-display error';
              resultContent.textContent = result || 'Failed to delete data';
              showToast('Failed to delete data', 'error');
            }
            
            resultDisplay.style.display = 'block';
          } catch (error) {
            resultDisplay.className = 'result-display error';
            resultContent.textContent = 'Error: ' + error.message;
            resultDisplay.style.display = 'block';
            showToast('Error deleting data', 'error');
          }
        });

        // Add event listener for JSON validation
        document.getElementById('json-data').addEventListener('input', function(e) {
          validateAndFormatJson(e.target.value);
        });
        
        // Add event listener for paste events to handle JSON formatting
        document.getElementById('json-data').addEventListener('paste', function(e) {
          // Use setTimeout to allow paste to complete before validation
          setTimeout(() => {
            validateAndFormatJson(e.target.value);
          }, 10);
        });


        // Initialize status checking
        document.addEventListener('DOMContentLoaded', () => {
          checkSearchStatus();
          statusCheckInterval = setInterval(checkSearchStatus, 5000);
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
          }
        });
      `}} />

      <SwaggerEmbed serviceUrl="/api/searching" serviceName="Searching" />
    </>
  );
};

export default Searching;