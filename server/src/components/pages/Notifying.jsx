import React from 'react';

const Notifying = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-envelope-check"></i>
          Notifying Service
          <div className="status-indicator" id="notifying-status"></div>
        </h1>
        <div className="header-actions">
          <p>Manage topics, subscribers, and send notifications</p>
          <button 
            className="btn btn-outline-primary api-docs-btn" 
            id="openApiDocsBtn"
            title="View API Documentation"
          >
            <i className="bi bi-book me-2"></i>API Documentation
          </button>
        </div>
      </div>

      {/* Create Topic Section */}
      <div className="notifying-section">
        <div className="notifying-form">
          <h2>Create Topic</h2>
          
          <div className="form-group">
            <label htmlFor="topicName">Topic Name:</label>
            <input type="text" id="topicName" className="form-control" placeholder="Enter topic name (e.g., user-updates, system-alerts)..." required />
          </div>
          
          <button type="button" className="btn btn-success" id="createTopicButton">
            <i className="bi bi-plus-circle me-2"></i>Create Topic
          </button>
        </div>
      </div>

      {/* Subscribe to Topic Section */}
      <div className="notifying-section">
        <div className="notifying-form section-divider">
          <h2>Subscribe to Topic</h2>
          
          <div className="form-group">
            <label htmlFor="subscribeTopicName">Topic Name:</label>
            <input type="text" id="subscribeTopicName" className="form-control" placeholder="Enter existing topic name..." required />
          </div>
          
          <div className="form-group">
            <label htmlFor="callbackUrl">Callback URL:</label>
            <input type="url" id="callbackUrl" className="form-control" placeholder="Enter callback URL (e.g., https://api.example.com/webhook)..." required />
          </div>
          
          <div className="subscriber-operations">
            <button type="button" className="btn btn-primary" id="subscribeButton">
              <i className="bi bi-bell me-2"></i>Subscribe
            </button>
            <button type="button" className="btn btn-danger" id="unsubscribeButton">
              <i className="bi bi-bell-slash me-2"></i>Unsubscribe
            </button>
          </div>
        </div>
      </div>

      {/* Send Notification Section */}
      <div className="notifying-section">
        <div className="notifying-form section-divider">
          <h2>Send Notification</h2>
          
          <div className="form-group">
            <label htmlFor="notifyTopicName">Topic Name:</label>
            <input type="text" id="notifyTopicName" className="form-control" placeholder="Enter topic name to notify..." required />
          </div>
          
          <div className="form-group">
            <label htmlFor="notificationMessage">Message:</label>
            <textarea id="notificationMessage" className="form-control" placeholder="Enter notification message..." required></textarea>
          </div>
          
          <button type="button" className="btn btn-warning" id="notifyButton">
            <i className="bi bi-send me-2"></i>Send Notification
          </button>
        </div>
      </div>

      {/* Topics Management Display */}
      <div className="topics-list" id="topicsList">
        <h3>Active Topics & Subscribers</h3>
        <div id="topicsContainer">
          <p style={{color: '#6b7280', fontStyle: 'italic'}}>No topics created yet. Create a topic above to get started.</p>
        </div>
      </div>

      <div className="notification-result" id="notificationResult" style={{display: 'none'}}>
        <h3>Operation Result</h3>
        <pre id="resultContent"></pre>
      </div>

      {/* Toast container for Bootstrap notifications */}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{zIndex: 1100}}>
        <div id="notifyingToast" className="toast" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <svg className="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
            <strong className="me-auto" id="toastTitle">Notifying Service</strong>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div className="toast-body" id="toastMessage">
            {/* Toast message will be inserted here */}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .notifying-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .notifying-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .notifying-form h2 {
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
        .api-docs-btn {
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-color: #0052cc;
          color: #0052cc;
          background: transparent;
          transition: all 0.2s ease;
        }
        .api-docs-btn:hover {
          background: #0052cc;
          color: white;
          border-color: #0052cc;
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
        .subscriber-operations {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 1rem;
        }
        .topics-list {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          min-height: 120px;
        }
        .topics-list h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .topic-item {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .topic-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .topic-name {
          font-weight: 600;
          color: #172b4d;
          font-size: 1rem;
        }
        .subscriber-count {
          background: #e3f2fd;
          color: #1976d2;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .subscribers-list {
          margin-top: 0.75rem;
          font-size: 0.875rem;
        }
        .subscriber-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }
        .callback-url {
          font-family: monospace;
          color: #6b7280;
          word-break: break-all;
          flex: 1;
          margin-right: 0.5rem;
        }
        .unsubscribe-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          cursor: pointer;
          flex-shrink: 0;
        }
        .unsubscribe-btn:hover {
          background: #c82333;
        }
        .notification-result {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          min-height: 120px;
        }
        .notification-result h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .notification-result pre {
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
        .section-divider {
          border-top: 1px solid #dfe1e6;
          margin: 2rem 0;
          padding-top: 2rem;
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
        .btn-warning {
          background: #ff8b00;
          color: #ffffff;
        }
        .btn-warning:hover {
          background: #ffab00;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(255, 139, 0, 0.3);
        }
        @media (max-width: 768px) {
          .subscriber-operations {
            grid-template-columns: 1fr;
          }
          .topic-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .subscriber-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        // In-memory storage for UI topics and subscribers (for display purposes only)
        let topics = new Map();

        // Check service status on page load
        async function checkServiceStatus() {
          try {
            const response = await fetch('/api/notifying/status');
            const statusIndicator = document.getElementById('notifying-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Notifying service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Notifying service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('notifying-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Notifying service is offline';
          }
        }

        // Show toast notification
        function showToast(message, isError = false) {
          const toast = new bootstrap.Toast(document.getElementById('notifyingToast'));
          document.getElementById('toastMessage').textContent = message;
          document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
          toast.show();
        }

        // Show result in result panel
        function showResult(content, title = 'Operation Result') {
          const resultPanel = document.getElementById('notificationResult');
          const resultContent = document.getElementById('resultContent');
          
          resultContent.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
          resultPanel.style.display = 'block';
          
          // Scroll to result
          resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Update topics display
        function updateTopicsDisplay() {
          const container = document.getElementById('topicsContainer');
          
          if (topics.size === 0) {
            container.innerHTML = '<p style="color: #6b7280; font-style: italic;">No topics created yet. Create a topic above to get started.</p>';
            return;
          }
          
          let html = '';
          topics.forEach((subscribers, topicName) => {
            html += \`
              <div class="topic-item">
                <div class="topic-header">
                  <div class="topic-name">\${topicName}</div>
                  <div class="subscriber-count">\${subscribers.size} subscriber\${subscribers.size !== 1 ? 's' : ''}</div>
                </div>
                <div class="subscribers-list">
            \`;
            
            if (subscribers.size === 0) {
              html += '<p style="color: #6b7280; font-style: italic; margin: 0;">No subscribers yet</p>';
            } else {
              subscribers.forEach(callbackUrl => {
                html += \`
                  <div class="subscriber-item">
                    <div class="callback-url">\${callbackUrl}</div>
                    <button class="unsubscribe-btn" onclick="removeSubscriber('\${topicName}', '\${callbackUrl}')">
                      Remove
                    </button>
                  </div>
                \`;
              });
            }
            
            html += '</div></div>';
          });
          
          container.innerHTML = html;
        }

        // Remove subscriber from UI and server
        async function removeSubscriber(topicName, callbackUrl) {
          try {
            const response = await fetch(\`/api/notifying/unsubscribe/topic/\${encodeURIComponent(topicName)}\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ callbackUrl: callbackUrl })
            });
            
            if (response.ok) {
              // Update local storage
              if (topics.has(topicName)) {
                topics.get(topicName).delete(callbackUrl);
              }
              updateTopicsDisplay();
              showToast(\`Unsubscribed \${callbackUrl} from \${topicName}\`);
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to unsubscribe: ' + error.message, true);
          }
        }

        // Create topic
        document.getElementById('createTopicButton').addEventListener('click', async function() {
          const topicName = document.getElementById('topicName').value.trim();
          
          if (!topicName) {
            showToast('Please enter a topic name', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Creating...';
            
            const response = await fetch('/api/notifying/topic', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ topic: topicName })
            });
            
            if (response.ok) {
              // Add to local storage
              if (!topics.has(topicName)) {
                topics.set(topicName, new Set());
              }
              updateTopicsDisplay();
              showToast(\`Topic "\${topicName}" created successfully\`);
              showResult(\`Topic "\${topicName}" created successfully\`);
              
              // Clear the input
              document.getElementById('topicName').value = '';
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to create topic: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Create Topic';
          }
        });

        // Subscribe to topic
        document.getElementById('subscribeButton').addEventListener('click', async function() {
          const topicName = document.getElementById('subscribeTopicName').value.trim();
          const callbackUrl = document.getElementById('callbackUrl').value.trim();
          
          if (!topicName) {
            showToast('Please enter a topic name', true);
            return;
          }
          
          if (!callbackUrl) {
            showToast('Please enter a callback URL', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Subscribing...';
            
            const response = await fetch(\`/api/notifying/subscribe/topic/\${encodeURIComponent(topicName)}\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ callbackUrl: callbackUrl })
            });
            
            if (response.ok) {
              // Update local storage
              if (!topics.has(topicName)) {
                topics.set(topicName, new Set());
              }
              topics.get(topicName).add(callbackUrl);
              updateTopicsDisplay();
              showToast(\`Subscribed to "\${topicName}" successfully\`);
              showResult(\`Subscribed \${callbackUrl} to topic "\${topicName}"\`);
              
              // Clear the callback URL field
              document.getElementById('callbackUrl').value = '';
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to subscribe: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-bell me-2"></i>Subscribe';
          }
        });

        // Unsubscribe from topic
        document.getElementById('unsubscribeButton').addEventListener('click', async function() {
          const topicName = document.getElementById('subscribeTopicName').value.trim();
          const callbackUrl = document.getElementById('callbackUrl').value.trim();
          
          if (!topicName) {
            showToast('Please enter a topic name', true);
            return;
          }
          
          if (!callbackUrl) {
            showToast('Please enter a callback URL', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Unsubscribing...';
            
            const response = await fetch(\`/api/notifying/unsubscribe/topic/\${encodeURIComponent(topicName)}\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ callbackUrl: callbackUrl })
            });
            
            if (response.ok) {
              // Update local storage
              if (topics.has(topicName)) {
                topics.get(topicName).delete(callbackUrl);
              }
              updateTopicsDisplay();
              showToast(\`Unsubscribed from "\${topicName}" successfully\`);
              showResult(\`Unsubscribed \${callbackUrl} from topic "\${topicName}"\`);
              
              // Clear the callback URL field
              document.getElementById('callbackUrl').value = '';
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to unsubscribe: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-bell-slash me-2"></i>Unsubscribe';
          }
        });

        // Send notification
        document.getElementById('notifyButton').addEventListener('click', async function() {
          const topicName = document.getElementById('notifyTopicName').value.trim();
          const message = document.getElementById('notificationMessage').value.trim();
          
          if (!topicName) {
            showToast('Please enter a topic name', true);
            return;
          }
          
          if (!message) {
            showToast('Please enter a notification message', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Sending...';
            
            const response = await fetch(\`/api/notifying/notify/topic/\${encodeURIComponent(topicName)}\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ message: message })
            });
            
            if (response.ok) {
              const subscriberCount = topics.has(topicName) ? topics.get(topicName).size : 0;
              showToast(\`Notification sent to "\${topicName}" (\${subscriberCount} subscribers)\`);
              showResult(\`Notification sent to topic "\${topicName}"\\nMessage: \${message}\\nSubscribers notified: \${subscriberCount}\`);
              
              // Clear the message field
              document.getElementById('notificationMessage').value = '';
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to send notification: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-send me-2"></i>Send Notification';
          }
        });

        // Open API Documentation popup
        document.getElementById('openApiDocsBtn').addEventListener('click', function() {
          const apiDocsUrl = '/api/notifying/docs';
          const popupWidth = 1200;
          const popupHeight = 800;
          const left = (screen.width - popupWidth) / 2;
          const top = (screen.height - popupHeight) / 2;
          
          const popup = window.open(
            apiDocsUrl,
            'NotifyingAPIDocumentation',
            \`width=\${popupWidth},height=\${popupHeight},left=\${left},top=\${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no\`
          );
          
          if (popup) {
            popup.focus();
          } else {
            // Fallback if popup was blocked
            showToast('Please allow popups for this site and try again, or visit /api/notifying/docs directly.', true);
          }
        });

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
          checkServiceStatus();
          updateTopicsDisplay();
          
          // Check status periodically
          setInterval(checkServiceStatus, 30000); // Check every 30 seconds
        });
      `}} />
    </>
  );
};

export default Notifying;