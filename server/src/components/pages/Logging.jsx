import React from 'react';
import SwaggerEmbed from '../shared/SwaggerEmbed';

const Logging = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-list-columns-reverse"></i>
          Logging Service
          <div className="status-indicator" id="logging-status"></div>
        </h1>
        <div className="header-actions">
          <p>Interact with the application logging service</p>
        </div>
      </div>

      <div className="logging-section">
        <div className="logging-form">
          <h2>Log Message</h2>
          <form id="loggingForm">
            <div className="form-group">
              <label htmlFor="logName">Log Name (optional):</label>
              <input type="text" id="logName" name="name" className="form-control" placeholder="Enter log name..." />
            </div>
            
            <div className="form-group">
              <label htmlFor="logMessage">Message (JSON format required):</label>
              <textarea 
                id="logMessage" 
                name="message" 
                className="form-control" 
                placeholder="Enter your JSON message...&#10;{&#10;  &quot;level&quot;: &quot;info&quot;,&#10;  &quot;message&quot;: &quot;Your log message here&quot;,&#10;  &quot;timestamp&quot;: &quot;2024-01-01T00:00:00Z&quot;&#10;}" 
                required
              ></textarea>
              <div className="json-validation-feedback" id="jsonValidation"></div>
            </div>
            
            <div className="form-group" id="jsonPreviewGroup" style={{display: 'none'}}>
              <label>Formatted JSON Preview:</label>
              <pre className="json-preview" id="jsonPreview"></pre>
            </div>
            
            <button type="submit" className="btn btn-primary" id="logButton" disabled>
              <i className="bi bi-journal-plus me-2"></i>Log Message
            </button>
          </form>
        </div>
      </div>

      <div className="logging-section error-logging-section">
        <div className="logging-form">
          <h2>Log Error Message</h2>
          <form id="errorLoggingForm">
            <div className="form-group">
              <label htmlFor="errorLogName">Error Log Name (optional):</label>
              <input type="text" id="errorLogName" name="errorName" className="form-control" placeholder="Enter error log name..." />
            </div>
            
            <div className="form-group">
              <label htmlFor="errorLogMessage">Error Message (JSON format required):</label>
              <textarea 
                id="errorLogMessage" 
                name="errorMessage" 
                className="form-control" 
                placeholder="Enter your error JSON message...&#10;{&#10;  &quot;level&quot;: &quot;error&quot;,&#10;  &quot;message&quot;: &quot;Database connection failed&quot;,&#10;  &quot;timestamp&quot;: &quot;2024-01-01T00:00:00Z&quot;,&#10;  &quot;error&quot;: &quot;Connection timeout&quot;,&#10;  &quot;service&quot;: &quot;user-service&quot;&#10;}" 
                required
              ></textarea>
              <div className="json-validation-feedback" id="errorJsonValidation"></div>
            </div>

            <div className="form-group template-buttons">
              <label>Error Templates:</label>
              <div className="template-button-group">
                <button type="button" className="btn btn-outline-secondary btn-sm" onclick="fillErrorTemplate('database')">
                  <i className="bi bi-database me-1"></i>Database Error
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onclick="fillErrorTemplate('api')">
                  <i className="bi bi-globe me-1"></i>API Error
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onclick="fillErrorTemplate('validation')">
                  <i className="bi bi-check-circle me-1"></i>Validation Error
                </button>
              </div>
            </div>
            
            <div className="form-group" id="errorJsonPreviewGroup" style={{display: 'none'}}>
              <label>Formatted JSON Preview:</label>
              <pre className="json-preview" id="errorJsonPreview"></pre>
            </div>
            
            <button type="submit" className="btn btn-danger" id="errorLogButton" disabled>
              <i className="bi bi-exclamation-triangle me-2"></i>Log Error
            </button>
          </form>
        </div>
      </div>

      <div className="recent-logs" id="recentLogs" style={{display: 'none'}}>
        <h3>Recent Logs</h3>
        <table className="logs-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Message</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody id="logsList">
          </tbody>
        </table>
      </div>

      <SwaggerEmbed serviceUrl="/api/logging" serviceName="Logging" />

      {/* Toast container for Bootstrap notifications */}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{zIndex: 1100}}>
        <div id="logToast" className="toast" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <svg className="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
            <strong className="me-auto" id="toastTitle">Logging Service</strong>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div className="toast-body" id="toastMessage">
            {/* Toast message will be inserted here */}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .logging-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .logging-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .logging-form h2 {
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
        .recent-logs {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-top: 2rem;
        }
        .recent-logs h3 {
          color: #172b4d;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0;
          padding: 1.5rem 2rem 1rem 2rem;
        }
        .logs-table {
          width: 100%;
          border-collapse: collapse;
        }
        .logs-table th {
          background: #f8f9fa;
          border-bottom: 1px solid #dfe1e6;
          padding: 0.75rem 1rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: #172b4d;
          text-align: left;
        }
        .logs-table td {
          border-bottom: 1px solid #f1f2f4;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #172b4d;
        }
        .logs-table tbody tr:hover {
          background: #f8f9fa;
        }
        .log-name-cell {
          color: #0052cc;
          font-weight: 500;
        }
        .log-time-cell {
          color: #5e6c84;
          font-size: 0.8rem;
          white-space: nowrap;
        }
        .log-message-cell {
          max-width: 300px;
          word-break: break-word;
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
        .error-logging-section {
          border-left: 4px solid #de350b;
          background: #fff8f7;
        }
        .error-logging-section .logging-form h2 {
          color: #de350b;
        }
        .template-buttons {
          margin-bottom: 1.5rem;
        }
        .template-button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .template-button-group .btn {
          display: flex;
          align-items: center;
        }
        .btn-danger {
          background-color: #de350b;
          border-color: #de350b;
          color: white;
        }
        .btn-danger:hover {
          background-color: #c42707;
          border-color: #b32306;
        }
        .btn-outline-secondary {
          border-color: #dfe1e6;
          color: #172b4d;
        }
        .btn-outline-secondary:hover {
          background-color: #f8f9fa;
          border-color: #dfe1e6;
          color: #172b4d;
        }
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        let recentLogs = [];
        let isValidJson = false;
        let isValidErrorJson = false;

        // JSON validation and formatting function
        function validateAndFormatJson(jsonString) {
          const messageField = document.getElementById('logMessage');
          const validationFeedback = document.getElementById('jsonValidation');
          const previewGroup = document.getElementById('jsonPreviewGroup');
          const previewElement = document.getElementById('jsonPreview');
          const logButton = document.getElementById('logButton');
          
          try {
            if (!jsonString.trim()) {
              // Empty input
              messageField.classList.remove('valid', 'invalid');
              validationFeedback.textContent = '';
              validationFeedback.className = 'json-validation-feedback';
              previewGroup.style.display = 'none';
              isValidJson = false;
              logButton.disabled = true;
              return;
            }
            
            // Try to parse JSON
            const parsed = JSON.parse(jsonString);
            
            // Valid JSON
            messageField.classList.remove('invalid');
            messageField.classList.add('valid');
            validationFeedback.textContent = '✓ Valid JSON';
            validationFeedback.className = 'json-validation-feedback valid';
            
            // Show formatted preview
            const formatted = JSON.stringify(parsed, null, 2);
            previewElement.textContent = formatted;
            previewGroup.style.display = 'block';
            
            isValidJson = true;
            logButton.disabled = false;
            
          } catch (error) {
            // Invalid JSON
            messageField.classList.remove('valid');
            messageField.classList.add('invalid');
            validationFeedback.textContent = '✗ Invalid JSON: ' + error.message;
            validationFeedback.className = 'json-validation-feedback invalid';
            previewGroup.style.display = 'none';
            
            isValidJson = false;
            logButton.disabled = true;
          }
        }

        // Error JSON validation and formatting function
        function validateAndFormatErrorJson(jsonString) {
          const messageField = document.getElementById('errorLogMessage');
          const validationFeedback = document.getElementById('errorJsonValidation');
          const previewGroup = document.getElementById('errorJsonPreviewGroup');
          const previewElement = document.getElementById('errorJsonPreview');
          const errorLogButton = document.getElementById('errorLogButton');
          
          try {
            if (!jsonString.trim()) {
              // Empty input
              messageField.classList.remove('valid', 'invalid');
              validationFeedback.textContent = '';
              validationFeedback.className = 'json-validation-feedback';
              previewGroup.style.display = 'none';
              isValidErrorJson = false;
              errorLogButton.disabled = true;
              return;
            }
            
            // Try to parse JSON
            const parsed = JSON.parse(jsonString);
            
            // Valid JSON
            messageField.classList.remove('invalid');
            messageField.classList.add('valid');
            validationFeedback.textContent = '✓ Valid Error JSON';
            validationFeedback.className = 'json-validation-feedback valid';
            
            // Show formatted preview
            const formatted = JSON.stringify(parsed, null, 2);
            previewElement.textContent = formatted;
            previewGroup.style.display = 'block';
            
            isValidErrorJson = true;
            errorLogButton.disabled = false;
            
          } catch (error) {
            // Invalid JSON
            messageField.classList.remove('valid');
            messageField.classList.add('invalid');
            validationFeedback.textContent = '✗ Invalid JSON: ' + error.message;
            validationFeedback.className = 'json-validation-feedback invalid';
            previewGroup.style.display = 'none';
            
            isValidErrorJson = false;
            errorLogButton.disabled = true;
          }
        }

        // Fill error message templates
        function fillErrorTemplate(type) {
          const errorMessageArea = document.getElementById('errorLogMessage');
          const timestamp = new Date().toISOString();
          
          let template = {};
          
          switch(type) {
            case 'database':
              template = {
                "level": "error",
                "message": "Database connection failed",
                "timestamp": timestamp,
                "error": "Connection timeout after 30 seconds",
                "service": "user-service",
                "stackTrace": "Error: Connection timeout\\n    at Database.connect..."
              };
              break;
            case 'api':
              template = {
                "level": "error",
                "message": "API endpoint failed",
                "timestamp": timestamp,
                "endpoint": "/api/users/123",
                "method": "GET",
                "statusCode": 500,
                "error": "Internal server error"
              };
              break;
            case 'validation':
              template = {
                "level": "error",
                "message": "Request validation failed",
                "timestamp": timestamp,
                "requestId": "req-abc123",
                "validationErrors": [
                  "Email is required",
                  "Password must be at least 8 characters"
                ]
              };
              break;
          }
          
          errorMessageArea.value = JSON.stringify(template, null, 2);
          validateAndFormatErrorJson(errorMessageArea.value);
        }

        // Check service status on page load
        async function checkServiceStatus() {
          try {
            const response = await fetch('/api/logging/status');
            const statusIndicator = document.getElementById('logging-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Logging service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Logging service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('logging-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Logging service is offline';
          }
        }

        // Handle form submission
        document.getElementById('loggingForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const formData = new FormData(this);
          const logButton = document.getElementById('logButton');
          const logResult = document.getElementById('logResult');
          
          // Get form values
          const name = formData.get('name') || 'user-log';
          const message = formData.get('message');
          
          if (!message.trim()) {
            showToast('Please enter a message to log.', 'error');
            return;
          }
          
          if (!isValidJson) {
            showToast('Please enter a valid JSON message.', 'error');
            return;
          }
          
          // Disable button and show loading
          logButton.disabled = true;
          logButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Logging...';
          
          try {
            const response = await fetch('/api/logging/log/' + name, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: message
            });
            
            if (response.ok) {
              showToast('Message logged successfully!', 'success');
              
              // Add to recent logs
              const logEntry = {
                name: name,
                message: message,
                time: new Date().toISOString()
              };
              recentLogs.unshift(logEntry);
              recentLogs = recentLogs.slice(0, 10); // Keep only last 10 logs
              updateRecentLogs();
              
              // Clear form
              document.getElementById('logMessage').value = '';
              document.getElementById('logName').value = '';
              validateAndFormatJson(''); // Reset validation state
            } else {
              throw new Error('Failed to log message');
            }
          } catch (error) {
            showToast('Failed to log message. Please try again.', 'error');
            console.error('Logging error:', error);
          } finally {
            // Re-enable button
            logButton.disabled = false;
            logButton.innerHTML = '<i class="bi bi-journal-plus me-2"></i>Log Message';
          }
        });

        // Handle error form submission
        document.getElementById('errorLoggingForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const formData = new FormData(this);
          const errorLogButton = document.getElementById('errorLogButton');
          
          // Get form values
          const errorName = formData.get('errorName') || 'application-error';
          const errorMessage = formData.get('errorMessage');
          
          if (!errorMessage.trim()) {
            showToast('Please enter an error message to log.', 'error');
            return;
          }
          
          if (!isValidErrorJson) {
            showToast('Please enter a valid JSON error message.', 'error');
            return;
          }
          
          // Disable button and show loading
          errorLogButton.disabled = true;
          errorLogButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Logging Error...';
          
          try {
            const response = await fetch('/api/logging/error/' + errorName, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: errorMessage
            });
            
            if (response.ok) {
              showToast('Error message logged successfully!', 'success');
              
              // Add to recent logs
              const logEntry = {
                name: errorName + ' (ERROR)',
                message: errorMessage,
                time: new Date().toISOString()
              };
              recentLogs.unshift(logEntry);
              recentLogs = recentLogs.slice(0, 10); // Keep only last 10 logs
              updateRecentLogs();
              
              // Clear form
              document.getElementById('errorLogMessage').value = '';
              document.getElementById('errorLogName').value = '';
              validateAndFormatErrorJson(''); // Reset validation state
            } else {
              throw new Error('Failed to log error message');
            }
          } catch (error) {
            showToast('Failed to log error message. Please try again.', 'error');
            console.error('Error logging error:', error);
          } finally {
            // Re-enable button
            errorLogButton.disabled = false;
            errorLogButton.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Log Error';
          }
        });

        function showToast(message, type) {
          const toast = document.getElementById('logToast');
          const toastBody = document.getElementById('toastMessage');
          const toastTitle = document.getElementById('toastTitle');
          const toastHeader = toast.querySelector('.toast-header');
          
          // Set message
          toastBody.textContent = message;
          
          // Set title and styling based on type
          if (type === 'success') {
            toastTitle.textContent = 'Success';
            toastHeader.classList.remove('bg-danger', 'text-white');
            toastHeader.classList.add('bg-success', 'text-white');
            toast.querySelector('svg rect').setAttribute('fill', '#198754');
          } else {
            toastTitle.textContent = 'Error';
            toastHeader.classList.remove('bg-success', 'text-white');
            toastHeader.classList.add('bg-danger', 'text-white');
            toast.querySelector('svg rect').setAttribute('fill', '#dc3545');
          }
          
          // Show toast
          const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 5000
          });
          bsToast.show();
        }

        function updateRecentLogs() {
          const recentLogsContainer = document.getElementById('recentLogs');
          const logsList = document.getElementById('logsList');
          
          if (recentLogs.length > 0) {
            recentLogsContainer.style.display = 'block';
            logsList.innerHTML = recentLogs.map(log => \`
              <tr>
                <td class="log-name-cell">\${log.name}</td>
                <td class="log-message-cell">\${log.message}</td>
                <td class="log-time-cell">\${new Date(log.time).toLocaleString()}</td>
              </tr>
            \`).join('');
          }
        }

        // Add event listener for JSON validation
        document.getElementById('logMessage').addEventListener('input', function(e) {
          validateAndFormatJson(e.target.value);
        });
        
        // Add event listener for paste events to handle JSON formatting
        document.getElementById('logMessage').addEventListener('paste', function(e) {
          // Use setTimeout to allow paste to complete before validation
          setTimeout(() => {
            validateAndFormatJson(e.target.value);
          }, 10);
        });

        // Add event listener for error JSON validation
        document.getElementById('errorLogMessage').addEventListener('input', function(e) {
          validateAndFormatErrorJson(e.target.value);
        });
        
        // Add event listener for paste events to handle error JSON formatting
        document.getElementById('errorLogMessage').addEventListener('paste', function(e) {
          // Use setTimeout to allow paste to complete before validation
          setTimeout(() => {
            validateAndFormatErrorJson(e.target.value);
          }, 10);
        });

        // Check status periodically
        checkServiceStatus();
        setInterval(checkServiceStatus, 30000); // Check every 30 seconds
      `}} />
    </>
  );
};

export default Logging;