import React from 'react';

const APIMonitor = () => {
  return (
    <>
      <div className="content-header">
        <h1>API Monitor</h1>
        <p>Monitor API calls and system performance</p>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick="refreshData()">
            Refresh
          </button>
          <button className="btn btn-secondary" onClick="testApiCall()">
            Test API
          </button>
        </div>
      </div>

      <div className="dashboard-stats" id="stats">
        {/* Stats will be populated by JavaScript */}
      </div>

      <div className="api-calls-table">
        <h2>Recent API Calls</h2>
        <div className="controls">
          <label>
            Auto-refresh:
            <input 
              type="checkbox" 
              id="autoRefresh" 
              onChange="toggleAutoRefresh()" 
              defaultChecked 
            />
          </label>
          <label>
            Filter by method:
            <select id="methodFilter" onChange="filterCalls()">
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </label>
          <label>
            Filter by status:
            <select id="statusFilter" onChange="filterCalls()">
              <option value="">All Status</option>
              <option value="2">2xx Success</option>
              <option value="3">3xx Redirect</option>
              <option value="4">4xx Client Error</option>
              <option value="5">5xx Server Error</option>
            </select>
          </label>
        </div>
        <div className="table-container">
          <table id="apiCallsTable">
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>URL</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Size</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              {/* API calls will be populated by JavaScript */}
            </tbody>
          </table>
        </div>
      </div>

      <div className="swagger-section">
        <div className="section-header">
          <h2>API Documentation & Testing</h2>
          <button className="btn btn-secondary" onClick="refreshSwagger()">
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh Swagger
          </button>
        </div>
        <div className="swagger-container">
          <div id="swagger-ui"></div>
        </div>
      </div>
      
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
      
      <script dangerouslySetInnerHTML={{__html: `
        let allCalls = [];
        let autoRefreshInterval;

        async function fetchApiCalls() {
          try {
            console.log('Fetching API calls...');
            const response = await fetch('/api-monitor-data');
            console.log('Response received:', response.status);
            const data = await response.json();
            console.log('Data received:', data.length, 'calls');
            allCalls = data;
            updateStats(data);
            filterCalls();
          } catch (error) {
            console.error('Error fetching API calls:', error);
          }
        }

        function updateStats(calls) {
          const totalCalls = calls.length;
          const avgDuration = calls.length > 0 ? 
            (calls.reduce((sum, call) => sum + call.duration, 0) / calls.length).toFixed(2) + 'ms' : 
            '0ms';
          
          const errorRate = calls.length > 0 ? 
            ((calls.filter(call => call.status >= 400).length / calls.length) * 100).toFixed(1) + '%' : 
            '0%';
          
          const avgSize = calls.length > 0 ? 
            formatBytes(calls.reduce((sum, call) => sum + (call.responseSize || 0), 0) / calls.length) : 
            '0 B';

          const statsHtml = \`
            <div class="stat-card">
              <h3>\${totalCalls}</h3>
              <p>Total API Calls</p>
            </div>
            <div class="stat-card">
              <h3>\${avgDuration}</h3>
              <p>Average Duration</p>
            </div>
            <div class="stat-card">
              <h3>\${errorRate}</h3>
              <p>Error Rate</p>
            </div>
            <div class="stat-card">
              <h3>\${avgSize}</h3>
              <p>Average Response Size</p>
            </div>
          \`;
          
          document.getElementById('stats').innerHTML = statsHtml;
        }

        function filterCalls() {
          const methodFilter = document.getElementById('methodFilter').value;
          const statusFilter = document.getElementById('statusFilter').value;
          
          let filteredCalls = allCalls;
          
          if (methodFilter) {
            filteredCalls = filteredCalls.filter(call => call.method === methodFilter);
          }
          
          if (statusFilter) {
            const statusPrefix = parseInt(statusFilter);
            filteredCalls = filteredCalls.filter(call => 
              Math.floor(call.status / 100) === statusPrefix
            );
          }
          
          updateTable(filteredCalls);
        }

        function updateTable(calls) {
          const tbody = document.getElementById('tableBody');
          
          if (calls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No API calls found</td></tr>';
            return;
          }
          
          const rows = calls.slice(0, 100).map(call => \`
            <tr>
              <td class="timestamp">\${new Date(call.timestamp).toLocaleString()}</td>
              <td><span class="method-badge method-\${call.method.toLowerCase()}">\${call.method}</span></td>
              <td>\${call.url}</td>
              <td><span class="status-badge status-\${Math.floor(call.status / 100)}xx">\${call.status}</span></td>
              <td class="duration">\${call.duration}ms</td>
              <td>\${formatBytes(call.responseSize || 0)}</td>
              <td>\${call.ip}</td>
            </tr>
          \`).join('');
          
          tbody.innerHTML = rows;
        }

        function formatBytes(bytes) {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function refreshData() {
          fetchApiCalls();
        }

        async function testApiCall() {
          try {
            await fetch('/api/files');
            setTimeout(fetchApiCalls, 500); // Refresh after a short delay
          } catch (error) {
            console.error('Test API call failed:', error);
          }
        }

        function toggleAutoRefresh() {
          const checkbox = document.getElementById('autoRefresh');
          if (checkbox.checked) {
            autoRefreshInterval = setInterval(fetchApiCalls, 5000);
          } else {
            clearInterval(autoRefreshInterval);
          }
        }

        // Swagger UI Functions
        function initSwaggerUI() {
          // Check if SwaggerUIBundle is available
          if (typeof SwaggerUIBundle === 'undefined') {
            console.error('SwaggerUIBundle is not loaded yet');
            document.getElementById('swagger-ui').innerHTML = 
              '<div class="alert alert-warning text-center p-4">' +
              '<div class="spinner-border mb-3" role="status"></div>' +
              '<p>Loading Swagger UI resources...</p>' +
              '</div>';
            
            // Retry after a delay
            setTimeout(initSwaggerUI, 1000);
            return;
          }

          try {
            const ui = SwaggerUIBundle({
              url: '/api-spec/swagger.json',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
              ],
              layout: "StandaloneLayout",
              validatorUrl: null,
              tryItOutEnabled: true,
              requestInterceptor: (request) => {
                // Ensure credentials are included for session-based auth
                request.credentials = 'include';
                return request;
              },
              responseInterceptor: (response) => {
                return response;
              },
              onComplete: () => {
                console.log('Swagger UI loaded successfully');
              },
              onFailure: (error) => {
                console.error('Swagger UI failed to load:', error);
                document.getElementById('swagger-ui').innerHTML = 
                  '<div class="alert alert-danger m-4" role="alert">' +
                  '<h4 class="alert-heading">Failed to Load API Documentation</h4>' +
                  '<p>There was an error loading the API specification:</p>' +
                  '<hr>' +
                  '<p class="mb-3">' + (error.message || 'Unknown error occurred') + '</p>' +
                  '<button class="btn btn-outline-danger" onclick="refreshSwagger()">' +
                  '<i class="bi bi-arrow-clockwise me-1"></i> Try Again' +
                  '</button>' +
                  '</div>';
              }
            });
            
            // Store reference for refresh functionality
            window.swaggerUI = ui;
          } catch (error) {
            console.error('Error initializing Swagger UI:', error);
            document.getElementById('swagger-ui').innerHTML = 
              '<div class="alert alert-danger m-4" role="alert">' +
              '<h4 class="alert-heading">Initialization Error</h4>' +
              '<p>Failed to initialize Swagger UI: ' + error.message + '</p>' +
              '<button class="btn btn-outline-danger" onclick="refreshSwagger()">' +
              '<i class="bi bi-arrow-clockwise me-1"></i> Try Again' +
              '</button>' +
              '</div>';
          }
        }
        
        function refreshSwagger() {
          console.log('Refreshing Swagger UI...');
          // Clear the container
          document.getElementById('swagger-ui').innerHTML = 
            '<div class="text-center p-4">' +
            '<div class="spinner-border text-primary" role="status"></div>' +
            '<p class="mt-2">Refreshing API documentation...</p>' +
            '</div>';
          
          // Reinitialize after a short delay
          setTimeout(initSwaggerUI, 1000);
        }

        // Wait for scripts to load before initializing
        function waitForSwaggerScripts() {
          if (typeof SwaggerUIBundle !== 'undefined' && typeof SwaggerUIStandalonePreset !== 'undefined') {
            initSwaggerUI();
          } else {
            console.log('Waiting for Swagger UI scripts to load...');
            setTimeout(waitForSwaggerScripts, 500);
          }
        }

        // Initialize both API Monitor and Swagger UI
        fetchApiCalls();
        if (document.getElementById('autoRefresh').checked) {
          toggleAutoRefresh();
        }

        // Start checking for Swagger scripts after DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', waitForSwaggerScripts);
        } else {
          waitForSwaggerScripts();
        }
      `}} />
      
      <style dangerouslySetInnerHTML={{__html: `
        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .stat-card h3 {
          color: #0052cc;
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .stat-card p {
          color: #5e6c84;
          font-size: 0.875rem;
          font-weight: 400;
        }

        .api-calls-table {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          overflow-x: auto;
        }

        .api-calls-table h2 {
          color: #172b4d;
          margin-bottom: 1rem;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .controls {
          margin-bottom: 1rem;
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .controls label {
          color: #172b4d;
          font-weight: 400;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .controls input, .controls select {
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid #dfe1e6;
          background: #ffffff;
          color: #172b4d;
          font-size: 0.875rem;
        }

        .table-container {
          overflow-x: auto;
          max-height: 60vh;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #dfe1e6;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e8ec;
        }

        th {
          background: #f4f5f7;
          font-weight: 500;
          color: #172b4d;
          position: sticky;
          top: 0;
          font-size: 0.875rem;
        }

        tr:hover {
          background: #f4f5f7;
        }

        .method-badge {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          color: white;
        }

        .method-get { background: #36b37e; }
        .method-post { background: #0052cc; }
        .method-put { background: #ff8b00; }
        .method-delete { background: #de350b; }
        .method-patch { background: #6554c0; }

        .status-badge {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          color: white;
        }

        .status-2xx { background: #36b37e; }
        .status-3xx { background: #ff8b00; }
        .status-4xx { background: #ff991f; }
        .status-5xx { background: #de350b; }

        .duration {
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .timestamp {
          font-size: 0.875rem;
          color: #5e6c84;
        }

        /* Swagger Section Styles */
        .swagger-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-top: 2rem;
          overflow: hidden;
        }

        .section-header {
          background: #f4f5f7;
          padding: 1.5rem;
          border-bottom: 1px solid #dfe1e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-header h2 {
          color: #172b4d;
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .swagger-container {
          background: #ffffff;
          padding: 0;
          min-height: 600px;
          overflow: hidden;
        }

        /* Custom Swagger UI styling to match our theme */
        #swagger-ui .swagger-ui {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        #swagger-ui .topbar {
          background-color: #0052cc;
        }

        #swagger-ui .topbar .download-url-wrapper {
          display: none;
        }

        #swagger-ui .info .title {
          color: #172b4d;
          font-size: 2rem;
          font-weight: 600;
        }

        #swagger-ui .info .description {
          color: #5e6c84;
        }

        #swagger-ui .opblock-tag {
          border-bottom: 1px solid #dfe1e6;
          background: #ffffff;
        }

        #swagger-ui .opblock-tag:hover {
          background: #f4f5f7;
        }

        #swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #36b37e;
        }

        #swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #0052cc;
        }

        #swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #ff8b00;
        }

        #swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #de350b;
        }

        #swagger-ui .opblock.opblock-patch .opblock-summary-method {
          background: #6554c0;
        }

        #swagger-ui .btn.authorize {
          background-color: #0052cc;
          border-color: #0052cc;
        }

        #swagger-ui .btn.authorize:hover {
          background-color: #0065ff;
        }

        #swagger-ui .btn.try-out__btn {
          background-color: #0052cc;
          border-color: #0052cc;
          color: white;
        }

        #swagger-ui .btn.try-out__btn:hover {
          background-color: #0065ff;
        }

        #swagger-ui .btn.execute {
          background-color: #36b37e;
          border-color: #36b37e;
        }

        #swagger-ui .response-col_status {
          font-weight: 600;
        }

        #swagger-ui .response.highlighted {
          border: 2px solid #0052cc;
        }

        /* Loading state */
        .swagger-container .spinner-border {
          color: #0052cc;
        }

        /* Error state */
        .swagger-container .alert-danger {
          margin: 2rem;
          border-radius: 8px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          
          .swagger-container {
            margin: 0 -1rem;
            border-left: none;
            border-right: none;
            border-radius: 0;
          }
          
          #swagger-ui .swagger-ui .wrapper {
            padding: 0 1rem;
          }
        }
      `}} />
    </>
  );
};

export default APIMonitor;