import React from 'react';
import SwaggerEmbed from '../shared/SwaggerEmbed';

const Working = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-gear-wide"></i>
          Working Service
          <div className="status-indicator" id="working-status"></div>
        </h1>
        <div className="header-actions">
          <p>Execute worker tasks and manage background processes</p>
        </div>
      </div>

      <div className="working-section">
        <div className="working-form">
          <h2><i className="bi bi-play-circle me-2"></i>Execute Worker Task</h2>
          <form id="run-worker-form">
            <div className="form-group">
              <label htmlFor="script-path">Script Filename</label>
              <input 
                type="text" 
                id="script-path" 
                name="script-path" 
                className="form-control" 
                placeholder="e.g., /path/to/script.js or script.js"
                required
              />
              <div className="script-examples">
                <strong>Examples:</strong>
                <ul>
                  <li>absolute path: <code>/home/user/scripts/task.js</code></li>
                  <li>relative path: <code>./scripts/task.js</code></li>
                  <li>filename only: <code>worker-script.js</code></li>
                </ul>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="worker-data">Data to Pass (JSON format required if provided)</label>
              <textarea 
                id="worker-data" 
                name="worker-data" 
                className="form-control textarea-control" 
                placeholder="Enter your JSON data (optional)...&#10;{&#10;  &quot;key&quot;: &quot;value&quot;,&#10;  &quot;numbers&quot;: [1, 2, 3],&#10;  &quot;message&quot;: &quot;Hello Worker!&quot;&#10;}"
              ></textarea>
              <div className="json-validation-feedback" id="jsonValidation"></div>
              <div className="script-examples">
                <strong>Note:</strong> Data must be valid JSON format. Leave empty if no data is needed.
              </div>
            </div>
            
            <div className="form-group" id="jsonPreviewGroup" style={{display: 'none'}}>
              <label>Formatted JSON Preview:</label>
              <pre className="json-preview" id="jsonPreview"></pre>
            </div>
            
            <button type="submit" className="btn btn-primary" id="runWorkerButton">
              <i className="bi bi-play-fill me-1"></i>Run Worker
            </button>
            <button type="button" className="btn btn-danger" onClick={() => window.stopWorker && window.stopWorker()}>
              <i className="bi bi-stop-fill me-1"></i>Stop Worker
            </button>
          </form>

          <div id="result-display" className="result-display">
            <h4>Worker Result:</h4>
            <pre id="result-content"></pre>
          </div>
        </div>
      </div>

      <div className="worker-stats-section">
        <div className="stats-header">
          <h2>
            <i className="bi bi-speedometer2 me-2"></i>
            Worker Execution Statistics
          </h2>
          <button type="button" className="btn btn-outline-primary btn-sm" id="refreshWorkerStatsButton">
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover" id="workerStatsTable">
            <thead>
              <tr>
                <th>Worker Name</th>
                <th>Executions</th>
                <th>Start Run</th>
                <th>End Run</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody id="workerStatsTableBody">
              <tr id="noWorkerStatsRow">
                <td colspan="5" className="text-center text-muted">No worker statistics available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .working-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .working-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .working-form h2 {
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
        }
        .btn-primary:hover {
          background: #0065ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 82, 204, 0.3);
        }
        .btn-danger {
          background: #de350b;
          color: #ffffff;
          margin-left: 1rem;
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
        .script-examples {
          background: #f4f5f7;
          padding: 1rem;
          border-radius: 4px;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #5e6c84;
        }
        .script-examples ul {
          margin: 0;
          padding-left: 1.5rem;
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
        .worker-stats-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          background: #f8f9fa;
          border-bottom: 1px solid #dfe1e6;
        }
        .stats-header h2 {
          color: #172b4d;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
        }
        .table-responsive {
          padding: 0;
        }
        .table {
          margin-bottom: 0;
        }
        .table th {
          background: #f8f9fa;
          border-top: none;
          border-bottom: 2px solid #dfe1e6;
          color: #5e6c84;
          font-weight: 600;
          font-size: 0.875rem;
          padding: 1rem;
        }
        .table td {
          padding: 1rem;
          color: #172b4d;
          font-size: 0.875rem;
          border-bottom: 1px solid #f4f5f7;
        }
        .table-hover tbody tr:hover {
          background-color: #f8f9fa;
        }
        .text-muted {
          color: #5e6c84 !important;
        }
        .worker-name {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          background: #f4f5f7;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.8125rem;
        }
        .executions-badge {
          background: #e3fcef;
          color: #006644;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .time-text {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.8125rem;
        }
        .duration-badge {
          background: #fff4e6;
          color: #974f0c;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .btn-outline-primary {
          background: transparent;
          color: #0052cc;
          border: 1px solid #0052cc;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }
        .btn-outline-primary:hover {
          background: #0052cc;
          color: white;
        }
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        let statusCheckInterval;
        let isValidJson = true; // Data is optional, so start as valid

        // JSON validation and formatting function
        function validateAndFormatJson(jsonString) {
          const dataField = document.getElementById('worker-data');
          const validationFeedback = document.getElementById('jsonValidation');
          const previewGroup = document.getElementById('jsonPreviewGroup');
          const previewElement = document.getElementById('jsonPreview');
          const runButton = document.getElementById('runWorkerButton');
          
          try {
            if (!jsonString.trim()) {
              // Empty input is allowed for data field
              dataField.classList.remove('valid', 'invalid');
              validationFeedback.textContent = 'Optional - Leave empty if no data needed';
              validationFeedback.className = 'json-validation-feedback';
              previewGroup.style.display = 'none';
              isValidJson = true;
              runButton.disabled = false;
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
            runButton.disabled = false;
            
          } catch (error) {
            // Invalid JSON
            dataField.classList.remove('valid');
            dataField.classList.add('invalid');
            validationFeedback.textContent = '✗ Invalid JSON: ' + error.message;
            validationFeedback.className = 'json-validation-feedback invalid';
            previewGroup.style.display = 'none';
            
            isValidJson = false;
            runButton.disabled = true;
          }
        }

        // Check service status
        async function checkWorkingStatus() {
          try {
            const response = await fetch('/api/working/status');
            const statusIndicator = document.getElementById('working-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Working service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Working service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('working-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Working service is offline';
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

        // Calculate duration between start and end times
        function calculateDuration(startTime, endTime) {
          if (!startTime || !endTime) return 'N/A';
          
          try {
            const start = new Date(startTime).getTime();
            const end = new Date(endTime).getTime();
            const durationMs = end - start;
            
            if (durationMs < 1000) {
              return durationMs + 'ms';
            } else if (durationMs < 60000) {
              return (durationMs / 1000).toFixed(1) + 's';
            } else {
              const minutes = Math.floor(durationMs / 60000);
              const seconds = Math.floor((durationMs % 60000) / 1000);
              return minutes + 'm ' + seconds + 's';
            }
          } catch (error) {
            return 'Error';
          }
        }

        // Load and display worker statistics
        async function loadWorkerStats() {
          try {
            const response = await fetch('/api/working/stats');
            if (response.ok) {
              const stats = await response.json();
              displayWorkerStats(stats);
            } else {
              console.error('Failed to load worker stats:', await response.text());
              displayWorkerStats([]);
            }
          } catch (error) {
            console.error('Error loading worker stats:', error);
            displayWorkerStats([]);
          }
        }

        // Display worker statistics in table
        function displayWorkerStats(stats) {
          const tableBody = document.getElementById('workerStatsTableBody');
          const noStatsRow = document.getElementById('noWorkerStatsRow');
          
          // Clear existing rows except the no-data row
          const existingRows = tableBody.querySelectorAll('tr:not(#noWorkerStatsRow)');
          existingRows.forEach(row => row.remove());
          
          if (!stats || stats.length === 0) {
            noStatsRow.style.display = 'table-row';
            return;
          }
          
          noStatsRow.style.display = 'none';
          
          stats.forEach(stat => {
            const duration = calculateDuration(stat["start run"], stat["end run"]);
            const row = document.createElement('tr');
            row.innerHTML = \`
              <td><span class="worker-name">\${stat.workername}</span></td>
              <td><span class="executions-badge">\${stat.executions}</span></td>
              <td><span class="time-text">\${stat["start run"] || 'Never'}</span></td>
              <td><span class="time-text">\${stat["end run"] || 'Running...'}</span></td>
              <td><span class="duration-badge">\${duration}</span></td>
            \`;
            tableBody.appendChild(row);
          });
        }

        // Run worker task
        document.getElementById('run-worker-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const scriptPath = document.getElementById('script-path').value.trim();
          const workerDataText = document.getElementById('worker-data').value.trim();
          const resultDisplay = document.getElementById('result-display');
          const resultContent = document.getElementById('result-content');
          
          if (!scriptPath) {
            showToast('Script filename is required', 'error');
            return;
          }
          
          if (!isValidJson) {
            showToast('Please enter valid JSON data', 'error');
            return;
          }

          let workerData = null;
          if (workerDataText) {
            try {
              workerData = JSON.parse(workerDataText);
            } catch (error) {
              showToast('Invalid JSON format in data field', 'error');
              return;
            }
          }

          try {
            const response = await fetch('/api/working/run', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                task: scriptPath,
                data: workerData
              }),
            });

            const result = await response.text();
            
            if (response.ok) {
              resultDisplay.className = 'result-display success';
              resultContent.textContent = result || 'Worker task started successfully';
              showToast('Worker task started successfully', 'success');
              loadWorkerStats(); // Refresh stats after worker starts
            } else {
              resultDisplay.className = 'result-display error';
              resultContent.textContent = result || 'Failed to start worker task';
              showToast('Failed to start worker task', 'error');
            }
            
            resultDisplay.style.display = 'block';
          } catch (error) {
            resultDisplay.className = 'result-display error';
            resultContent.textContent = 'Error: ' + error.message;
            resultDisplay.style.display = 'block';
            showToast('Error starting worker task', 'error');
          }
        });

        // Stop worker
        window.stopWorker = async function stopWorker() {
          try {
            const response = await fetch('/api/working/stop');
            const result = await response.text();
            
            if (response.ok) {
              showToast('Worker stopped successfully', 'success');
              loadWorkerStats(); // Refresh stats after worker stops
              
              const resultDisplay = document.getElementById('result-display');
              const resultContent = document.getElementById('result-content');
              resultDisplay.className = 'result-display';
              resultContent.textContent = 'Worker stopped';
              resultDisplay.style.display = 'block';
            } else {
              showToast('Failed to stop worker', 'error');
            }
          } catch (error) {
            showToast('Error stopping worker', 'error');
          }
        }

        // Add event listener for JSON validation
        document.getElementById('worker-data').addEventListener('input', function(e) {
          validateAndFormatJson(e.target.value);
        });
        
        // Add event listener for paste events to handle JSON formatting
        document.getElementById('worker-data').addEventListener('paste', function(e) {
          // Use setTimeout to allow paste to complete before validation
          setTimeout(() => {
            validateAndFormatJson(e.target.value);
          }, 10);
        });

        // Refresh worker stats button
        document.getElementById('refreshWorkerStatsButton').addEventListener('click', async function() {
          const originalHtml = this.innerHTML;
          this.disabled = true;
          this.innerHTML = '<i class="spinner-border spinner-border-sm me-1"></i>Refreshing...';
          
          await loadWorkerStats();
          
          this.disabled = false;
          this.innerHTML = originalHtml;
        });

        // Initialize status checking
        document.addEventListener('DOMContentLoaded', () => {
          checkWorkingStatus();
          statusCheckInterval = setInterval(checkWorkingStatus, 5000);
          
          // Load worker stats initially
          loadWorkerStats();
          
          // Refresh stats periodically
          setInterval(loadWorkerStats, 30000); // Refresh every 30 seconds
          
          // Initialize validation state
          validateAndFormatJson(''); // Initialize as valid (optional)
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
          }
        });
      `}} />

      <SwaggerEmbed serviceUrl="/api/working" serviceName="Working" />
    </>
  );
};

export default Working;