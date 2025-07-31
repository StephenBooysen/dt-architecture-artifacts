import React from 'react';

const Measuring = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-speedometer2"></i>
          Measuring Service
          <div className="status-indicator" id="measuring-status"></div>
        </h1>
        <div className="header-actions">
          <p>Capture metrics and analyze measurements over time</p>
          <button 
            className="btn btn-outline-primary api-docs-btn" 
            id="openApiDocsBtn"
            title="View API Documentation"
          >
            <i className="bi bi-book me-2"></i>API Documentation
          </button>
        </div>
      </div>

      {/* Add Measurement Section */}
      <div className="measuring-section">
        <div className="measuring-form">
          <h2>Add Measurement</h2>
          
          <div className="form-group">
            <label htmlFor="metricName">Metric Name:</label>
            <input type="text" id="metricName" className="form-control" placeholder="Enter metric name (e.g., cpu_usage, response_time)..." required />
          </div>
          
          <div className="form-group">
            <label htmlFor="metricValue">Value:</label>
            <input type="number" id="metricValue" className="form-control" placeholder="Enter numeric value..." step="any" required />
          </div>
          
          <button type="button" className="btn btn-success" id="addMetricButton">
            <i className="bi bi-plus-circle me-2"></i>Add Measurement
          </button>
        </div>
      </div>

      {/* Query Measurements Section */}
      <div className="measuring-section">
        <div className="measuring-form section-divider">
          <h2>Query Measurements</h2>
          
          <div className="form-group">
            <label htmlFor="queryMetricName">Metric Name:</label>
            <input type="text" id="queryMetricName" className="form-control" placeholder="Enter metric name to query..." required />
          </div>
          
          <div className="date-range-container">
            <div className="form-group">
              <label htmlFor="startDateTime">Start Date & Time:</label>
              <input type="datetime-local" id="startDateTime" className="form-control" required />
            </div>
            
            <div className="form-group">
              <label htmlFor="endDateTime">End Date & Time:</label>
              <input type="datetime-local" id="endDateTime" className="form-control" required />
            </div>
          </div>
          
          <div className="query-operations">
            <button type="button" className="btn btn-info" id="listButton">
              <i className="bi bi-list-ul me-2"></i>List Measurements
            </button>
            <button type="button" className="btn btn-primary" id="totalButton">
              <i className="bi bi-calculator me-2"></i>Get Total
            </button>
            <button type="button" className="btn btn-warning" id="averageButton">
              <i className="bi bi-bar-chart me-2"></i>Get Average
            </button>
          </div>
        </div>
      </div>

      <div className="metrics-result" id="metricsResult" style={{display: 'none'}}>
        <h3 id="resultTitle">Results</h3>
        
        <div className="metrics-summary" id="metricsSummary" style={{display: 'none'}}>
          <div className="summary-card">
            <h4>Count</h4>
            <div className="summary-value" id="measurementCount">-</div>
          </div>
          <div className="summary-card">
            <h4>Total</h4>
            <div className="summary-value" id="measurementTotal">-</div>
          </div>
          <div className="summary-card">
            <h4>Average</h4>
            <div className="summary-value" id="measurementAverage">-</div>
          </div>
        </div>
        
        <div className="measurements-list" id="measurementsList" style={{display: 'none'}}>
          <table className="measurements-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody id="measurementsTableBody">
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .measuring-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .measuring-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .measuring-form h2 {
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
        .date-range-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .query-operations {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
          margin-top: 1rem;
        }
        .metrics-result {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          min-height: 120px;
        }
        .metrics-result h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .metrics-summary {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .summary-card {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 6px;
          padding: 1rem;
          text-align: center;
        }
        .summary-card h4 {
          color: #172b4d;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
        }
        .summary-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #0052cc;
        }
        .measurements-list {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 4px;
          max-height: 300px;
          overflow-y: auto;
        }
        .measurements-table {
          width: 100%;
          border-collapse: collapse;
        }
        .measurements-table th {
          background: #f8f9fa;
          border-bottom: 1px solid #dfe1e6;
          padding: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: #172b4d;
          text-align: left;
          position: sticky;
          top: 0;
        }
        .measurements-table td {
          border-bottom: 1px solid #f1f2f4;
          padding: 0.75rem;
          font-size: 0.875rem;
          color: #172b4d;
        }
        .measurements-table tbody tr:hover {
          background: #f8f9fa;
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
        .btn-success {
          background: #36b37e;
          color: #ffffff;
        }
        .btn-success:hover {
          background: #57d9a3;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(54, 179, 126, 0.3);
        }
        .btn-info {
          background: #0052cc;
          color: #ffffff;
        }
        .btn-info:hover {
          background: #0065ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 82, 204, 0.3);
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
        .btn-warning {
          background: #ffab00;
          color: #ffffff;
        }
        .btn-warning:hover {
          background: #ffc947;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(255, 171, 0, 0.3);
        }
        @media (max-width: 768px) {
          .date-range-container,
          .query-operations,
          .metrics-summary {
            grid-template-columns: 1fr;
          }
        }
      `}} />

      <script dangerouslySetInnerHTML={{__html: `
        // Check service status on page load
        async function checkServiceStatus() {
          try {
            const response = await fetch('/api/measuring/status');
            const statusIndicator = document.getElementById('measuring-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Measuring service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Measuring service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('measuring-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Measuring service is offline';
          }
        }

        // Show toast notification
        function showToast(message, isError = false) {
          const toast = document.createElement('div');
          toast.className = 'toast show';
          toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ffffff; border: 1px solid #dfe1e6; border-radius: 4px; padding: 1rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); z-index: 1000; border-left: 4px solid ' + (isError ? '#de350b' : '#36b37e') + ';';
          toast.innerHTML = \`
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <i class="bi bi-\${isError ? 'exclamation-triangle' : 'check-circle'}" style="color: \${isError ? '#de350b' : '#36b37e'};"></i>
              <span>\${message}</span>
            </div>
          \`;
          
          document.body.appendChild(toast);
          setTimeout(() => document.body.removeChild(toast), 3000);
        }

        // Show results
        function showResults(title, data, type = 'list') {
          const resultPanel = document.getElementById('metricsResult');
          const resultTitle = document.getElementById('resultTitle');
          const summaryPanel = document.getElementById('metricsSummary');
          const listPanel = document.getElementById('measurementsList');
          
          resultTitle.textContent = title;
          resultPanel.style.display = 'block';
          
          if (type === 'list' && Array.isArray(data)) {
            // Show measurements list
            summaryPanel.style.display = 'grid';
            listPanel.style.display = 'block';
            
            // Update summary
            document.getElementById('measurementCount').textContent = data.length;
            const total = data.reduce((sum, item) => sum + item.value, 0);
            document.getElementById('measurementTotal').textContent = total.toFixed(2);
            document.getElementById('measurementAverage').textContent = data.length > 0 ? (total / data.length).toFixed(2) : '0';
            
            // Update table
            const tableBody = document.getElementById('measurementsTableBody');
            tableBody.innerHTML = '';
            
            if (data.length === 0) {
              const row = tableBody.insertRow();
              const cell = row.insertCell(0);
              cell.colSpan = 2;
              cell.textContent = 'No measurements found for the specified period';
              cell.style.textAlign = 'center';
              cell.style.fontStyle = 'italic';
              cell.style.color = '#6b7280';
            } else {
              data.forEach(measurement => {
                const row = tableBody.insertRow();
                const timestampCell = row.insertCell(0);
                const valueCell = row.insertCell(1);
                
                timestampCell.textContent = new Date(measurement.timestamp).toLocaleString();
                valueCell.textContent = measurement.value;
              });
            }
          } else {
            // Show single value result
            summaryPanel.style.display = 'none';
            listPanel.style.display = 'none';
            
            const resultContent = document.createElement('div');
            resultContent.style.cssText = 'background: #ffffff; border: 1px solid #dfe1e6; border-radius: 4px; padding: 2rem; text-align: center; font-size: 2rem; font-weight: bold; color: #0052cc;';
            resultContent.textContent = typeof data === 'number' ? data.toFixed(2) : data;
            
            // Remove any existing result content
            const existingContent = resultPanel.querySelector('.single-result');
            if (existingContent) {
              existingContent.remove();
            }
            
            resultContent.className = 'single-result';
            resultPanel.appendChild(resultContent);
          }
          
          // Scroll to result
          resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Add measurement
        document.getElementById('addMetricButton').addEventListener('click', async function() {
          const metricName = document.getElementById('metricName').value.trim();
          const metricValue = parseFloat(document.getElementById('metricValue').value);
          
          if (!metricName) {
            showToast('Please enter a metric name', true);
            return;
          }
          
          if (isNaN(metricValue)) {
            showToast('Please enter a valid numeric value', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Adding...';
            
            const response = await fetch('/api/measuring/add', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ metric: metricName, value: metricValue })
            });
            
            if (response.ok) {
              showToast(\`Measurement added successfully: \${metricName} = \${metricValue}\`);
              
              // Clear the value field, keep metric name for convenience
              document.getElementById('metricValue').value = '';
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to add measurement: ' + error.message, true);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Add Measurement';
          }
        });

        // List measurements
        document.getElementById('listButton').addEventListener('click', async function() {
          const metricName = document.getElementById('queryMetricName').value.trim();
          const startDateTime = document.getElementById('startDateTime').value;
          const endDateTime = document.getElementById('endDateTime').value;
          
          if (!metricName || !startDateTime || !endDateTime) {
            showToast('Please fill in all fields', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Loading...';
            
            const startDate = new Date(startDateTime).toISOString();
            const endDate = new Date(endDateTime).toISOString();
            
            const response = await fetch(\`/api/measuring/list/\${encodeURIComponent(metricName)}/\${encodeURIComponent(startDate)}/\${encodeURIComponent(endDate)}\`);
            
            if (response.ok) {
              const measurements = await response.json();
              showToast(\`Found \${measurements.length} measurements\`);
              showResults(\`Measurements for "\${metricName}"\`, measurements, 'list');
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to list measurements: ' + error.message, true);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-list-ul me-2"></i>List Measurements';
          }
        });

        // Get total
        document.getElementById('totalButton').addEventListener('click', async function() {
          const metricName = document.getElementById('queryMetricName').value.trim();
          const startDateTime = document.getElementById('startDateTime').value;
          const endDateTime = document.getElementById('endDateTime').value;
          
          if (!metricName || !startDateTime || !endDateTime) {
            showToast('Please fill in all fields', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Calculating...';
            
            const startDate = new Date(startDateTime).toISOString();
            const endDate = new Date(endDateTime).toISOString();
            
            const response = await fetch(\`/api/measuring/total/\${encodeURIComponent(metricName)}/\${encodeURIComponent(startDate)}/\${encodeURIComponent(endDate)}\`);
            
            if (response.ok) {
              const total = await response.json();
              showToast('Total calculated successfully');
              showResults(\`Total for "\${metricName}"\`, total, 'single');
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to calculate total: ' + error.message, true);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-calculator me-2"></i>Get Total';
          }
        });

        // Get average
        document.getElementById('averageButton').addEventListener('click', async function() {
          const metricName = document.getElementById('queryMetricName').value.trim();
          const startDateTime = document.getElementById('startDateTime').value;
          const endDateTime = document.getElementById('endDateTime').value;
          
          if (!metricName || !startDateTime || !endDateTime) {
            showToast('Please fill in all fields', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Calculating...';
            
            const startDate = new Date(startDateTime).toISOString();
            const endDate = new Date(endDateTime).toISOString();
            
            const response = await fetch(\`/api/measuring/average/\${encodeURIComponent(metricName)}/\${encodeURIComponent(startDate)}/\${encodeURIComponent(endDate)}\`);
            
            if (response.ok) {
              const average = await response.json();
              showToast('Average calculated successfully');
              showResults(\`Average for "\${metricName}"\`, average, 'single');
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to calculate average: ' + error.message, true);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-bar-chart me-2"></i>Get Average';
          }
        });

        // Initialize default date range (last 24 hours)
        function initializeDateRange() {
          const now = new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          
          // Format for datetime-local input
          const formatDateTime = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return \`\${year}-\${month}-\${day}T\${hours}:\${minutes}\`;
          };
          
          document.getElementById('startDateTime').value = formatDateTime(yesterday);
          document.getElementById('endDateTime').value = formatDateTime(now);
        }

        // Open API Documentation popup
        document.getElementById('openApiDocsBtn').addEventListener('click', function() {
          const apiDocsUrl = '/api/measuring/docs';
          const popupWidth = 1200;
          const popupHeight = 800;
          const left = (screen.width - popupWidth) / 2;
          const top = (screen.height - popupHeight) / 2;
          
          const popup = window.open(
            apiDocsUrl,
            'MeasuringAPIDocumentation',
            \`width=\${popupWidth},height=\${popupHeight},left=\${left},top=\${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no\`
          );
          
          if (popup) {
            popup.focus();
          } else {
            // Fallback if popup was blocked
            showToast('Please allow popups for this site and try again, or visit /api/measuring/docs directly.', true);
          }
        });

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
          checkServiceStatus();
          initializeDateRange();
          
          // Check status periodically
          setInterval(checkServiceStatus, 30000); // Check every 30 seconds
        });
      `}} />
    </>
  );
};

export default Measuring;