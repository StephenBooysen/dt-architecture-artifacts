import React from 'react';
import SwaggerEmbed from '../shared/SwaggerEmbed';

const Filing = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-folder"></i>
          Filing Service
          <div className="status-indicator" id="filing-status"></div>
        </h1>
        <div className="header-actions">
          <p>Multi-cloud file storage management with local, FTP, and S3 providers</p>
        </div>
      </div>

      <div className="filing-tabs">
        <button className="filing-tab active" onClick={() => switchTab('upload')}>Upload File</button>
        <button className="filing-tab" onClick={() => switchTab('download')}>Download File</button>
        <button className="filing-tab" onClick={() => switchTab('list')}>List Files</button>
        <button className="filing-tab" onClick={() => switchTab('delete')}>Delete File</button>
      </div>

      {/* Upload File Tab */}
      <div id="upload-tab" className="tab-content active">
        <div className="filing-section">
          <div className="filing-form">
            <h2><i className="bi bi-upload me-2"></i>Upload File</h2>
            <form id="upload-file-form">
              <div className="form-group">
                <label htmlFor="file-input">Select File</label>
                <input 
                  type="file" 
                  id="file-input" 
                  name="file-input" 
                  className="form-control" 
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="provider-select">Storage Provider</label>
                <select id="provider-select" name="provider-select" className="form-control" required>
                  <option value="local">Local Storage</option>
                  <option value="ftp">FTP Storage</option>
                  <option value="s3">AWS S3 Storage</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="file-path">File Path (optional)</label>
                <input 
                  type="text" 
                  id="file-path" 
                  name="file-path" 
                  className="form-control" 
                  placeholder="uploads/documents/file.pdf"
                />
                <div className="filing-examples">
                  <strong>Path Examples:</strong>
                  <ul>
                    <li><code>documents/report.pdf</code> - Store in documents folder</li>
                    <li><code>images/photo.jpg</code> - Store in images folder</li>
                    <li>Leave empty to use filename only</li>
                  </ul>
                </div>
              </div>
              
              <button type="submit" className="btn btn-success">
                <i className="bi bi-upload me-1"></i>Upload File
              </button>
            </form>

            <div id="upload-result-display" className="result-display">
              <h4>Upload Result:</h4>
              <pre id="upload-result-content"></pre>
            </div>
          </div>
        </div>
      </div>

      {/* Download File Tab */}
      <div id="download-tab" className="tab-content">
        <div className="filing-section">
          <div className="filing-form">
            <h2><i className="bi bi-download me-2"></i>Download File</h2>
            <form id="download-file-form">
              <div className="form-group">
                <label htmlFor="download-provider">Storage Provider</label>
                <select id="download-provider" name="download-provider" className="form-control" required>
                  <option value="local">Local Storage</option>
                  <option value="ftp">FTP Storage</option>
                  <option value="s3">AWS S3 Storage</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="download-path">File Path</label>
                <input 
                  type="text" 
                  id="download-path" 
                  name="download-path" 
                  className="form-control" 
                  placeholder="documents/report.pdf"
                  required
                />
              </div>
              
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-download me-1"></i>Download File
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* List Files Tab */}
      <div id="list-tab" className="tab-content">
        <div className="filing-section">
          <div className="filing-form">
            <h2><i className="bi bi-list-ul me-2"></i>List Files</h2>
            <form id="list-files-form">
              <div className="form-group">
                <label htmlFor="list-provider">Storage Provider</label>
                <select id="list-provider" name="list-provider" className="form-control" required>
                  <option value="local">Local Storage</option>
                  <option value="ftp">FTP Storage</option>
                  <option value="s3">AWS S3 Storage</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="list-path">Directory Path (optional)</label>
                <input 
                  type="text" 
                  id="list-path" 
                  name="list-path" 
                  className="form-control" 
                  placeholder="documents/"
                />
              </div>
              
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-list-ul me-1"></i>List Files
              </button>
            </form>

            <div id="list-result-display" className="result-display">
              <h4>Files:</h4>
              <div id="files-container">
                <div className="no-results">No files listed yet</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete File Tab */}
      <div id="delete-tab" className="tab-content">
        <div className="filing-section">
          <div className="filing-form">
            <h2><i className="bi bi-trash me-2"></i>Delete File</h2>
            <form id="delete-file-form">
              <div className="form-group">
                <label htmlFor="delete-provider">Storage Provider</label>
                <select id="delete-provider" name="delete-provider" className="form-control" required>
                  <option value="local">Local Storage</option>
                  <option value="ftp">FTP Storage</option>
                  <option value="s3">AWS S3 Storage</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="delete-file-path">File Path</label>
                <input 
                  type="text" 
                  id="delete-file-path" 
                  name="delete-file-path" 
                  className="form-control" 
                  placeholder="documents/report.pdf"
                  required
                />
              </div>
              
              <button type="submit" className="btn btn-danger">
                <i className="bi bi-trash me-1"></i>Delete File
              </button>
            </form>

            <div id="delete-result-display" className="result-display">
              <h4>Delete Result:</h4>
              <pre id="delete-result-content"></pre>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .filing-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .filing-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .filing-form h2 {
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
        .filing-examples {
          background: #f4f5f7;
          padding: 1rem;
          border-radius: 4px;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #5e6c84;
        }
        .filing-examples ul {
          margin: 0;
          padding-left: 1.5rem;
        }
        .filing-tabs {
          display: flex;
          border-bottom: 1px solid #dfe1e6;
          margin-bottom: 2rem;
        }
        .filing-tab {
          padding: 1rem 1.5rem;
          background: #f4f5f7;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: #5e6c84;
          border-radius: 4px 4px 0 0;
          margin-right: 0.25rem;
        }
        .filing-tab.active {
          background: #ffffff;
          color: #172b4d;
          border-bottom: 2px solid #0052cc;
        }
        .filing-tab:hover {
          background: #e4e6ea;
        }
        .filing-tab.active:hover {
          background: #ffffff;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
        .no-results {
          text-align: center;
          padding: 2rem;
          color: #5e6c84;
          font-style: italic;
        }
        .file-item {
          padding: 1rem;
          border-bottom: 1px solid #f4f5f7;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .file-item:last-child {
          border-bottom: none;
        }
        .file-icon {
          font-size: 1.5rem;
          color: #0052cc;
        }
        .file-info {
          flex: 1;
        }
        .file-name {
          font-weight: 600;
          color: #172b4d;
          margin-bottom: 0.25rem;
        }
        .file-size {
          color: #5e6c84;
          font-size: 0.875rem;
        }
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        let statusCheckInterval;

        // Tab switching functionality
        function switchTab(tabName) {
          // Hide all tab contents
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Remove active class from all tabs
          document.querySelectorAll('.filing-tab').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Show selected tab content
          document.getElementById(tabName + '-tab').classList.add('active');
          
          // Add active class to selected tab
          event.target.classList.add('active');
        }

        // Check service status
        async function checkFilingStatus() {
          try {
            const response = await fetch('/api/filing/status');
            const statusIndicator = document.getElementById('filing-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Filing service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Filing service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('filing-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Filing service is offline';
          }
        }

        // Show toast notification
        function showToast(message, type = 'success') {
          const toast = document.createElement('div');
          toast.className = \`toast \${type}\`;
          toast.innerHTML = \`
            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 1rem; background: #ffffff; border: 1px solid #dfe1e6; border-radius: 4px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); position: fixed; top: 20px; right: 20px; z-index: 1000;">
              <i class="bi bi-\${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
              <span>\${message}</span>
            </div>
          \`;
          
          document.body.appendChild(toast);
          
          setTimeout(() => document.body.removeChild(toast), 3000);
        }

        // Upload file
        document.getElementById('upload-file-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const fileInput = document.getElementById('file-input');
          const provider = document.getElementById('provider-select').value;
          const filePath = document.getElementById('file-path').value.trim();
          const resultDisplay = document.getElementById('upload-result-display');
          const resultContent = document.getElementById('upload-result-content');
          
          if (!fileInput.files[0]) {
            showToast('Please select a file to upload', 'error');
            return;
          }

          const formData = new FormData();
          formData.append('file', fileInput.files[0]);
          formData.append('provider', provider);
          if (filePath) {
            formData.append('path', filePath);
          }

          try {
            const response = await fetch('/api/filing/upload', {
              method: 'POST',
              body: formData
            });

            const result = await response.text();
            
            if (response.ok) {
              resultDisplay.className = 'result-display success';
              resultContent.textContent = 'File uploaded successfully!';
              showToast('File uploaded successfully', 'success');
              fileInput.value = '';
              document.getElementById('file-path').value = '';
            } else {
              resultDisplay.className = 'result-display error';
              resultContent.textContent = result || 'Failed to upload file';
              showToast('Failed to upload file', 'error');
            }
            
            resultDisplay.style.display = 'block';
          } catch (error) {
            resultDisplay.className = 'result-display error';
            resultContent.textContent = 'Error: ' + error.message;
            resultDisplay.style.display = 'block';
            showToast('Error uploading file', 'error');
          }
        });

        // Download file
        document.getElementById('download-file-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const provider = document.getElementById('download-provider').value;
          const filePath = document.getElementById('download-path').value.trim();
          
          if (!filePath) {
            showToast('Please enter a file path', 'error');
            return;
          }

          try {
            const response = await fetch(\`/api/filing/download/\${provider}/\${encodeURIComponent(filePath)}\`);
            
            if (response.ok) {
              const blob = await response.blob();
              const filename = filePath.split('/').pop() || 'download';
              
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              showToast('File downloaded successfully', 'success');
            } else {
              const error = await response.text();
              showToast('Failed to download file: ' + error, 'error');
            }
          } catch (error) {
            showToast('Error downloading file', 'error');
          }
        });

        // List files
        document.getElementById('list-files-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const provider = document.getElementById('list-provider').value;
          const dirPath = document.getElementById('list-path').value.trim();
          const resultDisplay = document.getElementById('list-result-display');
          const filesContainer = document.getElementById('files-container');

          try {
            const url = dirPath ? 
              \`/api/filing/list/\${provider}/\${encodeURIComponent(dirPath)}\` :
              \`/api/filing/list/\${provider}\`;
              
            const response = await fetch(url);
            
            if (response.ok) {
              const files = await response.json();
              
              resultDisplay.className = 'result-display success';
              
              if (files.length === 0) {
                filesContainer.innerHTML = '<div class="no-results">No files found in this directory.</div>';
              } else {
                let filesHtml = '';
                files.forEach(file => {
                  filesHtml += \`
                    <div class="file-item">
                      <div class="file-icon">
                        <i class="bi bi-file-earmark"></i>
                      </div>
                      <div class="file-info">
                        <div class="file-name">\${file.name}</div>
                        <div class="file-size">\${file.size || 'Unknown size'}</div>
                      </div>
                    </div>
                  \`;
                });
                filesContainer.innerHTML = filesHtml;
              }
              
              showToast(\`Found \${files.length} file(s)\`, 'success');
            } else {
              const error = await response.text();
              resultDisplay.className = 'result-display error';
              filesContainer.innerHTML = '<div class="no-results">Error listing files</div>';
              showToast('Failed to list files', 'error');
            }
            
            resultDisplay.style.display = 'block';
          } catch (error) {
            resultDisplay.className = 'result-display error';
            filesContainer.innerHTML = '<div class="no-results">Error listing files</div>';
            resultDisplay.style.display = 'block';
            showToast('Error listing files', 'error');
          }
        });

        // Delete file
        document.getElementById('delete-file-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const provider = document.getElementById('delete-provider').value;
          const filePath = document.getElementById('delete-file-path').value.trim();
          const resultDisplay = document.getElementById('delete-result-display');
          const resultContent = document.getElementById('delete-result-content');
          
          if (!filePath) {
            showToast('Please enter a file path', 'error');
            return;
          }

          try {
            const response = await fetch(\`/api/filing/delete/\${provider}/\${encodeURIComponent(filePath)}\`, {
              method: 'DELETE'
            });

            const result = await response.text();
            
            if (response.ok) {
              resultDisplay.className = 'result-display success';
              resultContent.textContent = 'File deleted successfully!';
              showToast('File deleted successfully', 'success');
              document.getElementById('delete-file-path').value = '';
            } else {
              resultDisplay.className = 'result-display error';
              resultContent.textContent = result || 'Failed to delete file';
              showToast('Failed to delete file', 'error');
            }
            
            resultDisplay.style.display = 'block';
          } catch (error) {
            resultDisplay.className = 'result-display error';
            resultContent.textContent = 'Error: ' + error.message;
            resultDisplay.style.display = 'block';
            showToast('Error deleting file', 'error');
          }
        });


        // Initialize status checking
        document.addEventListener('DOMContentLoaded', () => {
          checkFilingStatus();
          statusCheckInterval = setInterval(checkFilingStatus, 5000);
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
          }
        });
      `}} />

      <SwaggerEmbed serviceUrl="/api/filing" serviceName="Filing" />
    </>
  );
};

export default Filing;