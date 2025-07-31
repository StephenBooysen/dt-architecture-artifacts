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

      {/* Define Workflow Section */}
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
                <label htmlFor="workflow-steps">Workflow Steps (JSON Array required)</label>
                <textarea 
                  id="workflow-steps" 
                  name="workflow-steps" 
                  className="form-control textarea-control" 
                  placeholder="Enter your JSON array of steps...&#10;[&#10;  &quot;./step1.js&quot;,&#10;  &quot;./step2.js&quot;,&#10;  &quot;./step3.js&quot;&#10;]"
                  required
                ></textarea>
                <div className="json-validation-feedback" id="stepsJsonValidation"></div>
                <div className="workflow-examples">
                  <strong>Steps Definition:</strong> JSON array of file paths to Node.js scripts
                  <pre>["./workflows/validate-data.js", "./workflows/process-data.js", "./workflows/save-results.js"]</pre>
                  <strong>Note:</strong> Each script should export a function that receives data and returns processed data.
                </div>
              </div>
              
              <div className="form-group" id="stepsJsonPreviewGroup" style={{display: 'none'}}>
                <label>Formatted JSON Preview:</label>
                <pre className="json-preview" id="stepsJsonPreview"></pre>
              </div>
              
              <button type="submit" className="btn btn-success" id="defineWorkflowButton" disabled>
                <i className="bi bi-plus-circle me-1"></i>Define Workflow
              </button>
            </form>

          <div id="define-result-display" className="result-display">
            <h4>Definition Result:</h4>
            <pre id="define-result-content"></pre>
          </div>
        </div>
      </div>

      {/* Execute Workflow Section */}
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
                <label htmlFor="workflow-data">Initial Data (JSON format required if provided)</label>
                <textarea 
                  id="workflow-data" 
                  name="workflow-data" 
                  className="form-control textarea-control" 
                  placeholder="Enter your JSON data (optional)...&#10;{&#10;  &quot;userId&quot;: 123,&#10;  &quot;action&quot;: &quot;process&quot;,&#10;  &quot;data&quot;: [1, 2, 3]&#10;}"
                ></textarea>
                <div className="json-validation-feedback" id="dataJsonValidation"></div>
                <div className="workflow-examples">
                  <strong>Initial Data:</strong> JSON object that will be passed to the first workflow step
                  <pre>{`{"input": "sample data", "config": {"retries": 3}, "metadata": {"timestamp": "2024-01-01"}}`}</pre>
                  <strong>Note:</strong> Leave empty if no initial data is needed.
                </div>
              </div>
              
              <div className="form-group" id="dataJsonPreviewGroup" style={{display: 'none'}}>
                <label>Formatted JSON Preview:</label>
                <pre className="json-preview" id="dataJsonPreview"></pre>
              </div>
              
              <button type="submit" className="btn btn-primary" id="executeWorkflowButton">
                <i className="bi bi-play-fill me-1"></i>Start Workflow
              </button>
            </form>

          <div id="execute-result-display" className="result-display">
            <h4>Execution Result:</h4>
            <pre id="execute-result-content"></pre>
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
        let isValidStepsJson = false;
        let isValidDataJson = true; // Data is optional, so start as valid

        // JSON validation function for steps field
        function validateStepsJson(jsonString) {
          const stepsField = document.getElementById('workflow-steps');
          const validationFeedback = document.getElementById('stepsJsonValidation');
          const previewGroup = document.getElementById('stepsJsonPreviewGroup');
          const previewElement = document.getElementById('stepsJsonPreview');
          const defineButton = document.getElementById('defineWorkflowButton');
          
          try {
            if (!jsonString.trim()) {
              // Empty input
              stepsField.classList.remove('valid', 'invalid');
              validationFeedback.textContent = '';
              validationFeedback.className = 'json-validation-feedback';
              previewGroup.style.display = 'none';
              isValidStepsJson = false;
              defineButton.disabled = true;
              return;
            }
            
            // Try to parse JSON
            const parsed = JSON.parse(jsonString);
            
            // Check if it's an array
            if (!Array.isArray(parsed)) {
              throw new Error('Steps must be an array');
            }
            
            // Valid JSON array
            stepsField.classList.remove('invalid');
            stepsField.classList.add('valid');
            validationFeedback.textContent = '✓ Valid JSON Array';
            validationFeedback.className = 'json-validation-feedback valid';
            
            // Show formatted preview
            const formatted = JSON.stringify(parsed, null, 2);
            previewElement.textContent = formatted;
            previewGroup.style.display = 'block';
            
            isValidStepsJson = true;
            defineButton.disabled = false;
            
          } catch (error) {
            // Invalid JSON
            stepsField.classList.remove('valid');
            stepsField.classList.add('invalid');
            validationFeedback.textContent = '✗ Invalid JSON: ' + error.message;
            validationFeedback.className = 'json-validation-feedback invalid';
            previewGroup.style.display = 'none';
            
            isValidStepsJson = false;
            defineButton.disabled = true;
          }
        }

        // JSON validation function for data field (optional)
        function validateDataJson(jsonString) {
          const dataField = document.getElementById('workflow-data');
          const validationFeedback = document.getElementById('dataJsonValidation');
          const previewGroup = document.getElementById('dataJsonPreviewGroup');
          const previewElement = document.getElementById('dataJsonPreview');
          const executeButton = document.getElementById('executeWorkflowButton');
          
          try {
            if (!jsonString.trim()) {
              // Empty input is allowed for data field
              dataField.classList.remove('valid', 'invalid');
              validationFeedback.textContent = 'Optional - Leave empty if no initial data needed';
              validationFeedback.className = 'json-validation-feedback';
              previewGroup.style.display = 'none';
              isValidDataJson = true;
              executeButton.disabled = false;
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
            
            isValidDataJson = true;
            executeButton.disabled = false;
            
          } catch (error) {
            // Invalid JSON
            dataField.classList.remove('valid');
            dataField.classList.add('invalid');
            validationFeedback.textContent = '✗ Invalid JSON: ' + error.message;
            validationFeedback.className = 'json-validation-feedback invalid';
            previewGroup.style.display = 'none';
            
            isValidDataJson = false;
            executeButton.disabled = true;
          }
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
          
          if (!isValidStepsJson) {
            showToast('Please enter valid JSON array for workflow steps', 'error');
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
          
          if (!isValidDataJson) {
            showToast('Please enter valid JSON for workflow data', 'error');
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

        // Add event listeners for JSON validation
        document.getElementById('workflow-steps').addEventListener('input', function(e) {
          validateStepsJson(e.target.value);
        });
        
        document.getElementById('workflow-steps').addEventListener('paste', function(e) {
          setTimeout(() => {
            validateStepsJson(e.target.value);
          }, 10);
        });
        
        document.getElementById('workflow-data').addEventListener('input', function(e) {
          validateDataJson(e.target.value);
        });
        
        document.getElementById('workflow-data').addEventListener('paste', function(e) {
          setTimeout(() => {
            validateDataJson(e.target.value);
          }, 10);
        });

        // Initialize status checking
        document.addEventListener('DOMContentLoaded', () => {
          checkWorkflowStatus();
          statusCheckInterval = setInterval(checkWorkflowStatus, 5000);
          
          // Initialize validation states
          validateDataJson(''); // Initialize data field as valid (optional)
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