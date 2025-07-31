import React from 'react';

const Workflow = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-bounding-box"></i>
          Workflow Service
          <div className="status-indicator" id="workflow-status"></div>
        </h1>
        <p>Define and execute sequential workflows with Node.js scripts</p>
      </div>

      <div className="workflow-tabs">
        <button className="workflow-tab active" onClick={() => window.switchTab && window.switchTab('define')}>Define Workflow</button>
        <button className="workflow-tab" onClick={() => window.switchTab && window.switchTab('execute')}>Execute Workflow</button>
      </div>

      {/* Define Workflow Tab */}
      <div id="define-tab" className="tab-content active">
        <div className="workflow-section">
          <div className="workflow-form">
            <h2><i className="bi bi-diagram-3 me-2"></i>Define Workflow Plan</h2>
            <form id="define-workflow-form">
              <div className="form-group">
                <label htmlFor="workflow-name">Workflow Name</label>
                <input 
                  type="text" 
                  id="workflow-name" 
                  name="workflow-name" 
                  className="form-control" 
                  placeholder="e.g., data-processing, user-onboarding"
                  required
                />
                <div className="workflow-examples">
                  <strong>Example:</strong> <code>data-processing-pipeline</code>, <code>user-registration-flow</code>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="workflow-steps">Workflow Steps (JSON Array)</label>
                <textarea 
                  id="workflow-steps" 
                  name="workflow-steps" 
                  className="form-control textarea-control" 
                  placeholder='["./step1.js", "./step2.js", "./step3.js"]'
                  required
                ></textarea>
                <div className="workflow-examples">
                  <strong>Steps Definition:</strong> JSON array of file paths to Node.js scripts
                  <pre>["./workflows/validate-data.js", "./workflows/process-data.js", "./workflows/save-results.js"]</pre>
                  <strong>Note:</strong> Each script should export a function that receives data and returns processed data.
                </div>
              </div>
              
              <button type="submit" className="btn btn-success">
                <i className="bi bi-plus-circle me-1"></i>Define Workflow
              </button>
            </form>

            <div id="define-result-display" className="result-display">
              <h4>Definition Result:</h4>
              <pre id="define-result-content"></pre>
            </div>
          </div>
        </div>
      </div>

      {/* Execute Workflow Tab */}
      <div id="execute-tab" className="tab-content">
        <div className="workflow-section">
          <div className="workflow-form">
            <h2><i className="bi bi-play-circle me-2"></i>Execute Workflow</h2>
            <form id="execute-workflow-form">
              <div className="form-group">
                <label htmlFor="execution-workflow-name">Workflow Name</label>
                <input 
                  type="text" 
                  id="execution-workflow-name" 
                  name="execution-workflow-name" 
                  className="form-control" 
                  placeholder="Enter the name of a defined workflow"
                  required
                />
                <div className="workflow-examples">
                  <strong>Note:</strong> This must match a previously defined workflow name
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="workflow-data">Initial Data (JSON)</label>
                <textarea 
                  id="workflow-data" 
                  name="workflow-data" 
                  className="form-control textarea-control" 
                  placeholder='{"userId": 123, "action": "process", "data": [1, 2, 3]}'
                ></textarea>
                <div className="workflow-examples">
                  <strong>Initial Data:</strong> JSON object that will be passed to the first workflow step
                  <pre>{"input": "sample data", "config": {"retries": 3}, "metadata": {"timestamp": "2024-01-01"}}</pre>
                  <strong>Note:</strong> Leave empty if no initial data is needed.
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-play-fill me-1"></i>Start Workflow
              </button>
            </form>

            <div id="execute-result-display" className="result-display">
              <h4>Execution Result:</h4>
              <pre id="execute-result-content"></pre>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .workflow-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .workflow-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .workflow-form h2 {
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
        }
        .btn-success:hover {
          background: #57d9a3;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(54, 179, 126, 0.3);
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
        .workflow-examples {
          background: #f4f5f7;
          padding: 1rem;
          border-radius: 4px;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #5e6c84;
        }
        .workflow-examples ul {
          margin: 0;
          padding-left: 1.5rem;
        }
        .workflow-examples pre {
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
        .workflow-tabs {
          display: flex;
          border-bottom: 1px solid #dfe1e6;
          margin-bottom: 2rem;
        }
        .workflow-tab {
          padding: 1rem 1.5rem;
          background: #f4f5f7;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: #5e6c84;
          border-radius: 4px 4px 0 0;
          margin-right: 0.25rem;
        }
        .workflow-tab.active {
          background: #ffffff;
          color: #172b4d;
          border-bottom: 2px solid #0052cc;
        }
        .workflow-tab:hover {
          background: #e4e6ea;
        }
        .workflow-tab.active:hover {
          background: #ffffff;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        let statusCheckInterval;

        // Tab switching functionality
        window.switchTab = function switchTab(tabName) {
          // Hide all tab contents
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Remove active class from all tabs
          document.querySelectorAll('.workflow-tab').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Show selected tab content
          document.getElementById(tabName + '-tab').classList.add('active');
          
          // Add active class to selected tab
          event.target.classList.add('active');
        }

        // Check service status
        async function checkWorkflowStatus() {
          try {
            const response = await fetch('/api/workflow/status');
            const statusIndicator = document.getElementById('workflow-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Workflow service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Workflow service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('workflow-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Workflow service is offline';
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

        // Define workflow
        document.getElementById('define-workflow-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const workflowName = document.getElementById('workflow-name').value.trim();
          const stepsText = document.getElementById('workflow-steps').value.trim();
          const resultDisplay = document.getElementById('define-result-display');
          const resultContent = document.getElementById('define-result-content');
          
          if (!workflowName || !stepsText) {
            showToast('Workflow name and steps are required', 'error');
            return;
          }

          let steps;
          try {
            steps = JSON.parse(stepsText);
            if (!Array.isArray(steps)) {
              throw new Error('Steps must be an array');
            }
          } catch (error) {
            showToast('Invalid JSON format in steps field', 'error');
            return;
          }

          try {
            const response = await fetch('/api/workflow/defineworkflow', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: workflowName,
                steps: steps
              }),
            });

            const result = await response.json();
            
            if (response.ok) {
              resultDisplay.className = 'result-display success';
              resultContent.textContent = JSON.stringify({
                message: 'Workflow defined successfully',
                name: workflowName,
                steps: steps,
                workflowId: result.workflowId
              }, null, 2);
              showToast('Workflow defined successfully', 'success');
            } else {
              resultDisplay.className = 'result-display error';
              resultContent.textContent = result.message || 'Failed to define workflow';
              showToast('Failed to define workflow', 'error');
            }
            
            resultDisplay.style.display = 'block';
          } catch (error) {
            resultDisplay.className = 'result-display error';
            resultContent.textContent = 'Error: ' + error.message;
            resultDisplay.style.display = 'block';
            showToast('Error defining workflow', 'error');
          }
        });

        // Execute workflow
        document.getElementById('execute-workflow-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const workflowName = document.getElementById('execution-workflow-name').value.trim();
          const dataText = document.getElementById('workflow-data').value.trim();
          const resultDisplay = document.getElementById('execute-result-display');
          const resultContent = document.getElementById('execute-result-content');
          
          if (!workflowName) {
            showToast('Workflow name is required', 'error');
            return;
          }

          let workflowData = null;
          if (dataText) {
            try {
              workflowData = JSON.parse(dataText);
            } catch (error) {
              showToast('Invalid JSON format in data field', 'error');
              return;
            }
          }

          try {
            const response = await fetch('/api/workflow/start', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: workflowName,
                data: workflowData
              }),
            });

            const result = await response.json();
            
            if (response.ok) {
              resultDisplay.className = 'result-display success';
              resultContent.textContent = JSON.stringify({
                message: 'Workflow started successfully',
                workflowName: workflowName,
                workflowId: result.workflowId,
                initialData: workflowData
              }, null, 2);
              showToast('Workflow started successfully', 'success');
            } else {
              resultDisplay.className = 'result-display error';
              resultContent.textContent = result.message || 'Failed to start workflow';
              showToast('Failed to start workflow', 'error');
            }
            
            resultDisplay.style.display = 'block';
          } catch (error) {
            resultDisplay.className = 'result-display error';
            resultContent.textContent = 'Error: ' + error.message;
            resultDisplay.style.display = 'block';
            showToast('Error starting workflow', 'error');
          }
        });

        // Initialize status checking
        document.addEventListener('DOMContentLoaded', () => {
          checkWorkflowStatus();
          statusCheckInterval = setInterval(checkWorkflowStatus, 5000);
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
          if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
          }
        });
      `}} />
    </>
  );
};

export default Workflow;