import React from 'react';

const Logging = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-list-columns-reverse"></i>
          Logging Service
          <div className="status-indicator" id="logging-status"></div>
        </h1>
        <p>Interact with the application logging service</p>
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
              <label htmlFor="logMessage">Message:</label>
              <textarea id="logMessage" name="message" className="form-control" placeholder="Enter your log message..." required></textarea>
            </div>
            
            <button type="submit" className="btn btn-primary" id="logButton">
              <i className="bi bi-journal-plus me-2"></i>Log Message
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
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        let recentLogs = [];

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
          
          // Disable button and show loading
          logButton.disabled = true;
          logButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Logging...';
          
          try {
            const response = await fetch('/api/logging/log', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: name,
                message: message,
                time: new Date().toISOString()
              })
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

        // Check status periodically
        checkServiceStatus();
        setInterval(checkServiceStatus, 30000); // Check every 30 seconds
      `}} />
    </>
  );
};

export default Logging;