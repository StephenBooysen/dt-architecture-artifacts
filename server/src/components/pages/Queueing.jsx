import React from 'react';

const Queueing = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-stack"></i>
          Queueing Service
          <div className="status-indicator" id="queueing-status"></div>
        </h1>
        <p>Manage task queues with enqueue and dequeue operations</p>
      </div>

      {/* Queue Statistics */}
      <div className="queue-stats">
        <h3>Current Queue Size</h3>
        <div className="queue-size" id="queueSize">-</div>
      </div>

      {/* Enqueue Section */}
      <div className="queueing-section">
        <div className="queueing-form">
          <h2>Enqueue Task</h2>
          
          <div className="form-group">
            <label htmlFor="queueName">Queue Name:</label>
            <input type="text" id="queueName" className="form-control" placeholder="Enter queue name..." defaultValue="default" />
          </div>
          
          <div className="form-group">
            <label htmlFor="queueData">Queue Data:</label>
            <textarea id="queueData" className="form-control" placeholder="Enter queue data (JSON or text)..." required></textarea>
          </div>
          
          <button type="button" className="btn btn-success" id="enqueueButton">
            <i className="bi bi-plus-circle me-2"></i>Enqueue Task
          </button>
        </div>
      </div>

      {/* Dequeue Section */}
      <div className="queueing-section">
        <div className="queueing-form section-divider">
          <h2>Dequeue Task</h2>
          
          <div className="form-group">
            <label htmlFor="dequeueQueueName">Queue Name:</label>
            <input type="text" id="dequeueQueueName" className="form-control" placeholder="Enter queue name..." defaultValue="default" />
          </div>
          
          <div className="queue-operations">
            <button type="button" className="btn btn-primary" id="dequeueButton">
              <i className="bi bi-arrow-down-circle me-2"></i>Dequeue Task
            </button>
            <button type="button" className="btn btn-info" id="refreshSizeButton">
              <i className="bi bi-arrow-clockwise me-2"></i>Refresh Size
            </button>
          </div>
        </div>
      </div>

      <div className="queue-result" id="queueResult" style={{display: 'none'}}>
        <h3>Result</h3>
        <pre id="resultContent"></pre>
      </div>

      {/* Toast container for Bootstrap notifications */}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{zIndex: 1100}}>
        <div id="queueToast" className="toast" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <svg className="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
            <strong className="me-auto" id="toastTitle">Queueing Service</strong>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div className="toast-body" id="toastMessage">
            {/* Toast message will be inserted here */}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .queueing-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .queueing-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .queueing-form h2 {
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
        .queue-operations {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 1rem;
        }
        .queue-stats {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          text-align: center;
        }
        .queue-stats h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .queue-size {
          font-size: 2rem;
          font-weight: bold;
          color: #0052cc;
        }
        .queue-result {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          min-height: 120px;
        }
        .queue-result h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .queue-result pre {
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
        .btn-info {
          background: #17a2b8;
          color: #ffffff;
        }
        .btn-info:hover {
          background: #138496;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(23, 162, 184, 0.3);
        }
        @media (max-width: 768px) {
          .queue-operations {
            grid-template-columns: 1fr;
          }
        }
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        // Check service status on page load
        async function checkServiceStatus() {
          try {
            const response = await fetch('/api/queueing/status');
            const statusIndicator = document.getElementById('queueing-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Queueing service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Queueing service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('queueing-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Queueing service is offline';
          }
        }

        // Update queue size display
        async function updateQueueSize() {
          try {
            const queueName = document.getElementById('queueName').value.trim() || 'default';
            const response = await fetch('/api/queueing/size/' + encodeURIComponent(queueName));
            if (response.ok) {
              const size = await response.json();
              document.getElementById('queueSize').textContent = size;
            } else {
              document.getElementById('queueSize').textContent = 'Error';
            }
          } catch (error) {
            document.getElementById('queueSize').textContent = 'Error';
          }
        }

        // Show toast notification
        function showToast(message, isError = false) {
          const toast = new bootstrap.Toast(document.getElementById('queueToast'));
          document.getElementById('toastMessage').textContent = message;
          document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
          toast.show();
        }

        // Show result in result panel
        function showResult(content, title = 'Result') {
          const resultPanel = document.getElementById('queueResult');
          const resultContent = document.getElementById('resultContent');
          
          resultContent.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
          resultPanel.style.display = 'block';
          
          // Scroll to result
          resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Enqueue operation
        document.getElementById('enqueueButton').addEventListener('click', async function() {
          const queueName = document.getElementById('queueName').value.trim();
          const queueData = document.getElementById('queueData').value.trim();
          
          if (!queueName) {
            showToast('Please enter a queue name', true);
            return;
          }
          
          if (!queueData) {
            showToast('Please enter task data', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Enqueuing...';
            
            const response = await fetch('/api/queueing/enqueue/' + encodeURIComponent(queueName), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: queueData
            });
            
            if (response.ok) {
              const result = await response.text();
              showToast('Task enqueued successfully');
              showResult('Task enqueued to queue "' + queueName + '" successfully');
              
              // Clear the task data field
              document.getElementById('queueData').value = '';
              
              // Update queue size
              updateQueueSize();
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to enqueue task: ' + error.message, true);
            showResult('Error: ' + error.message);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Enqueue Task';
          }
        });

        // Dequeue operation
        document.getElementById('dequeueButton').addEventListener('click', async function() {
          const queueName = document.getElementById('dequeueQueueName').value.trim();
          
          if (!queueName) {
            showToast('Please enter a queue name', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Dequeuing...';
            
            const response = await fetch('/api/queueing/dequeue/' + encodeURIComponent(queueName));
            
            if (response.ok) {
              const task = await response.json();
              if (task !== null && task !== undefined) {
                showToast('Task dequeued successfully');
                showResult(task, 'Dequeued Task');
              } else {
                showToast('Queue is empty', false);
                showResult('No tasks in queue');
              }
              
              // Update queue size
              updateQueueSize();
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to dequeue task: ' + error.message, true);
            showResult('Error: ' + error.message);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-arrow-down-circle me-2"></i>Dequeue Task';
          }
        });

        // Refresh size operation
        document.getElementById('refreshSizeButton').addEventListener('click', async function() {
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Refreshing...';
            
            const queueName = document.getElementById('dequeueQueueName').value.trim() || 'default';
            await updateQueueSize();
            showToast('Queue size refreshed');
          } catch (error) {
            showToast('Failed to refresh queue size', true);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Refresh Size';
          }
        });

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
          // Check status and update size periodically
          checkServiceStatus();
          updateQueueSize();
          
          setInterval(() => {
            checkServiceStatus();
            updateQueueSize();
          }, 30000); // Check every 30 seconds
        });
      `}} />
    </>
  );
};

export default Queueing;