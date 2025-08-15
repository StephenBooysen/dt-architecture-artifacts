import React from 'react';
import SwaggerEmbed from '../shared/SwaggerEmbed';

const Scheduling = () => {
  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-clock-history"></i>
          Scheduling Service
          <div className="status-indicator" id="scheduling-status"></div>
        </h1>
        <div className="header-actions">
          <p>Create and manage scheduled tasks with cron expressions</p>
        </div>
      </div>

      {/* Create Schedule Section */}
      <div className="scheduling-section">
        <div className="scheduling-form">
          <h2>Create Schedule</h2>
          
          <div className="form-group">
            <label htmlFor="scheduleName">Schedule Name:</label>
            <input type="text" id="scheduleName" className="form-control" placeholder="Enter unique schedule name (e.g., daily-backup, hourly-sync)..." required />
            <div className="help-text">This name will serve as the task identifier for the schedule</div>
          </div>
          
          <div className="form-group">
            <label htmlFor="scriptFilename">Script Filename:</label>
            <input type="text" id="scriptFilename" className="form-control" placeholder="Enter Node.js script filename (e.g., backup.js, sync-data.js)..." required />
            <div className="help-text">The Node.js file to execute on schedule (relative to project root)</div>
          </div>
          
          <div className="form-group">
            <label htmlFor="cronExpression">Cron Expression:</label>
            <input type="text" id="cronExpression" className="form-control" placeholder="Enter cron expression (e.g., 0 */6 * * *)..." required />
            <div className="help-text">Standard cron format: minute hour day month weekday</div>
            
            <div className="cron-examples">
              <h4>Common Cron Patterns:</h4>
              <div className="cron-example">
                <span className="cron-pattern">0 */6 * * *</span>
                <span className="cron-description">Every 6 hours</span>
              </div>
              <div className="cron-example">
                <span className="cron-pattern">0 0 * * *</span>
                <span className="cron-description">Daily at midnight</span>
              </div>
              <div className="cron-example">
                <span className="cron-pattern">0 0 * * 0</span>
                <span className="cron-description">Weekly on Sunday</span>
              </div>
              <div className="cron-example">
                <span className="cron-pattern">*/15 * * * *</span>
                <span className="cron-description">Every 15 minutes</span>
              </div>
              <div className="cron-example">
                <span className="cron-pattern">0 9 * * 1-5</span>
                <span className="cron-description">Weekdays at 9 AM</span>
              </div>
            </div>
          </div>
          
          <button type="button" className="btn btn-success" id="createScheduleButton">
            <i className="bi bi-calendar-plus me-2"></i>Create Schedule
          </button>
        </div>
      </div>

      {/* Delete Schedule Section */}
      <div className="scheduling-section">
        <div className="scheduling-form section-divider">
          <h2>Delete Schedule</h2>
          
          <div className="form-group">
            <label htmlFor="deleteScheduleName">Schedule Name to Delete:</label>
            <input type="text" id="deleteScheduleName" className="form-control" placeholder="Enter schedule name to delete..." required />
            <div className="help-text">Enter the exact name of the schedule you want to cancel</div>
          </div>
          
          <button type="button" className="btn btn-danger" id="deleteScheduleButton">
            <i className="bi bi-calendar-x me-2"></i>Delete Schedule
          </button>
        </div>
      </div>

      {/* Active Schedules Display */}
      <div className="schedules-list" id="schedulesList">
        <h3>Active Schedules</h3>
        <div id="schedulesContainer">
          <p style={{color: '#6b7280', fontStyle: 'italic'}}>No active schedules. Create a schedule above to get started.</p>
        </div>
      </div>

      <div className="scheduling-result" id="schedulingResult" style={{display: 'none'}}>
        <h3>Operation Result</h3>
        <pre id="resultContent"></pre>
      </div>

      <div className="schedule-stats-section">
        <div className="stats-header">
          <h2>
            <i className="bi bi-graph-up me-2"></i>
            Schedule Statistics
          </h2>
          <button type="button" className="btn btn-outline-primary btn-sm" id="refreshScheduleStatsButton">
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover" id="scheduleStatsTable">
            <thead>
              <tr>
                <th>Schedule Name</th>
                <th>Executions</th>
                <th>Last Run</th>
                <th>Next Run</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="scheduleStatsTableBody">
              <tr id="noScheduleStatsRow">
                <td colspan="5" className="text-center text-muted">No schedule statistics available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast container for Bootstrap notifications */}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{zIndex: 1100}}>
        <div id="schedulingToast" className="toast" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="toast-header">
            <svg className="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
            <strong className="me-auto" id="toastTitle">Scheduling Service</strong>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div className="toast-body" id="toastMessage">
            {/* Toast message will be inserted here */}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .scheduling-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          margin-bottom: 2rem;
        }
        .scheduling-form {
          padding: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .scheduling-form h2 {
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
        .cron-examples {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 1rem;
          margin-top: 0.5rem;
          font-size: 0.875rem;
        }
        .cron-examples h4 {
          color: #172b4d;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .cron-example {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.25rem;
          font-family: monospace;
        }
        .cron-pattern {
          color: #0052cc;
          font-weight: 500;
        }
        .cron-description {
          color: #6b7280;
          font-style: italic;
        }
        .schedules-list {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          min-height: 120px;
        }
        .schedules-list h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .schedule-item {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .schedule-info {
          flex: 1;
        }
        .schedule-name {
          font-weight: 600;
          color: #172b4d;
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        .schedule-details {
          font-size: 0.875rem;
          color: #6b7280;
          font-family: monospace;
        }
        .delete-schedule-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
          margin-left: 1rem;
        }
        .delete-schedule-btn:hover {
          background: #c82333;
        }
        .scheduling-result {
          background: #f8f9fa;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          min-height: 120px;
        }
        .scheduling-result h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .scheduling-result pre {
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
        .help-text {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.5rem;
          font-style: italic;
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
        @media (max-width: 768px) {
          .schedule-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .delete-schedule-btn {
            margin-left: 0;
            align-self: flex-end;
          }
          .cron-example {
            flex-direction: column;
            gap: 0.25rem;
          }
        }
        .schedule-stats-section {
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
        .schedule-name {
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
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-active {
          background: #e3fcef;
          color: #006644;
        }
        .status-inactive {
          background: #ffebe6;
          color: #974f0c;
        }
        .time-text {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.8125rem;
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
        // In-memory storage for UI schedules (for display purposes only)
        let schedules = new Map();

        // Check service status on page load
        async function checkServiceStatus() {
          try {
            const response = await fetch('/api/scheduling/status');
            const statusIndicator = document.getElementById('scheduling-status');
            
            if (response.ok) {
              statusIndicator.classList.remove('offline');
              statusIndicator.title = 'Scheduling service is online';
            } else {
              statusIndicator.classList.add('offline');
              statusIndicator.title = 'Scheduling service is offline';
            }
          } catch (error) {
            const statusIndicator = document.getElementById('scheduling-status');
            statusIndicator.classList.add('offline');
            statusIndicator.title = 'Scheduling service is offline';
          }
        }

        // Show toast notification
        function showToast(message, isError = false) {
          const toast = new bootstrap.Toast(document.getElementById('schedulingToast'));
          document.getElementById('toastMessage').textContent = message;
          document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
          toast.show();
        }

        // Show result in result panel
        function showResult(content, title = 'Operation Result') {
          const resultPanel = document.getElementById('schedulingResult');
          const resultContent = document.getElementById('resultContent');
          
          resultContent.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
          resultPanel.style.display = 'block';
          
          // Scroll to result
          resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Validate cron expression (basic validation)
        function isValidCronExpression(cron) {
          // Basic cron validation - should have 5 parts separated by spaces
          const parts = cron.trim().split(/\\s+/);
          if (parts.length !== 5) return false;
          
          // Each part should contain valid characters for cron
          const cronRegex = /^[0-9,*\\/\\-]+$/;
          return parts.every(part => cronRegex.test(part));
        }

        // Update schedules display
        function updateSchedulesDisplay() {
          const container = document.getElementById('schedulesContainer');
          
          if (schedules.size === 0) {
            container.innerHTML = '<p style="color: #6b7280; font-style: italic;">No active schedules. Create a schedule above to get started.</p>';
            return;
          }
          
          let html = '';
          schedules.forEach((schedule, scheduleName) => {
            html += \`
              <div class="schedule-item">
                <div class="schedule-info">
                  <div class="schedule-name">\${scheduleName}</div>
                  <div class="schedule-details">Script: \${schedule.script} | Cron: \${schedule.cron}</div>
                </div>
                <button class="delete-schedule-btn" onclick="deleteScheduleFromList('\${scheduleName}')">
                  <i class="bi bi-trash me-1"></i>Delete
                </button>
              </div>
            \`;
          });
          
          container.innerHTML = html;
        }

        // Load and display schedule statistics
        async function loadScheduleStats() {
          try {
            const response = await fetch('/api/scheduling/stats');
            if (response.ok) {
              const stats = await response.json();
              displayScheduleStats(stats);
            } else {
              console.error('Failed to load schedule stats:', await response.text());
              displayScheduleStats([]);
            }
          } catch (error) {
            console.error('Error loading schedule stats:', error);
            displayScheduleStats([]);
          }
        }

        // Display schedule statistics in table
        function displayScheduleStats(stats) {
          const tableBody = document.getElementById('scheduleStatsTableBody');
          const noStatsRow = document.getElementById('noScheduleStatsRow');
          
          // Clear existing rows except the no-data row
          const existingRows = tableBody.querySelectorAll('tr:not(#noScheduleStatsRow)');
          existingRows.forEach(row => row.remove());
          
          if (!stats || stats.length === 0) {
            noStatsRow.style.display = 'table-row';
            return;
          }
          
          noStatsRow.style.display = 'none';
          
          stats.forEach(stat => {
            const isActive = schedules.has(stat.schedulename);
            const row = document.createElement('tr');
            row.innerHTML = \`
              <td><span class="schedule-name">\${stat.schedulename}</span></td>
              <td><span class="executions-badge">\${stat["no of executions"]}</span></td>
              <td><span class="time-text">\${stat["last run"] || 'Never'}</span></td>
              <td><span class="time-text">\${stat["next run"]}</span></td>
              <td><span class="status-badge \${isActive ? 'status-active' : 'status-inactive'}">\${isActive ? 'Active' : 'Stopped'}</span></td>
            \`;
            tableBody.appendChild(row);
          });
        }

        // Delete schedule from UI and server
        async function deleteScheduleFromList(scheduleName) {
          try {
            const response = await fetch(\`/api/scheduling/cancel/\${encodeURIComponent(scheduleName)}\`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              // Update local storage
              schedules.delete(scheduleName);
              updateSchedulesDisplay();
              loadScheduleStats(); // Refresh stats after deleting schedule
              showToast(\`Schedule "\${scheduleName}" deleted successfully\`);
              showResult(\`Schedule "\${scheduleName}" has been cancelled and removed\`);
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to delete schedule: ' + error.message, true);
            showResult(\`Error deleting schedule: \${error.message}\`);
          }
        }

        // Create schedule
        document.getElementById('createScheduleButton').addEventListener('click', async function() {
          const scheduleName = document.getElementById('scheduleName').value.trim();
          const scriptFilename = document.getElementById('scriptFilename').value.trim();
          const cronExpression = document.getElementById('cronExpression').value.trim();
          
          if (!scheduleName) {
            showToast('Please enter a schedule name', true);
            return;
          }
          
          if (!scriptFilename) {
            showToast('Please enter a script filename', true);
            return;
          }
          
          if (!cronExpression) {
            showToast('Please enter a cron expression', true);
            return;
          }
          
          if (!isValidCronExpression(cronExpression)) {
            showToast('Please enter a valid cron expression (5 parts: minute hour day month weekday)', true);
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Creating...';
            
            const response = await fetch('/api/scheduling/schedule', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                task: scheduleName,
                cron: cronExpression
              })
            });
            
            if (response.ok) {
              // Add to local storage
              schedules.set(scheduleName, {
                script: scriptFilename,
                cron: cronExpression
              });
              updateSchedulesDisplay();
              loadScheduleStats(); // Refresh stats after creating schedule
              showToast(\`Schedule "\${scheduleName}" created successfully\`);
              showResult(\`Schedule created:\\nName: \${scheduleName}\\nScript: \${scriptFilename}\\nCron: \${cronExpression}\`);
              
              // Clear the inputs
              document.getElementById('scheduleName').value = '';
              document.getElementById('scriptFilename').value = '';
              document.getElementById('cronExpression').value = '';
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to create schedule: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-calendar-plus me-2"></i>Create Schedule';
          }
        });

        // Delete schedule by name
        document.getElementById('deleteScheduleButton').addEventListener('click', async function() {
          const scheduleName = document.getElementById('deleteScheduleName').value.trim();
          
          if (!scheduleName) {
            showToast('Please enter a schedule name to delete', true);
            return;
          }
          
          if (!confirm(\`Are you sure you want to delete the schedule "\${scheduleName}"?\`)) {
            return;
          }
          
          try {
            this.disabled = true;
            this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Deleting...';
            
            const response = await fetch(\`/api/scheduling/cancel/\${encodeURIComponent(scheduleName)}\`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              // Update local storage
              schedules.delete(scheduleName);
              updateSchedulesDisplay();
              loadScheduleStats(); // Refresh stats after deleting schedule
              showToast(\`Schedule "\${scheduleName}" deleted successfully\`);
              showResult(\`Schedule "\${scheduleName}" has been cancelled and removed\`);
              
              // Clear the input
              document.getElementById('deleteScheduleName').value = '';
            } else {
              const error = await response.text();
              throw new Error(error);
            }
          } catch (error) {
            showToast('Failed to delete schedule: ' + error.message, true);
            showResult(\`Error: \${error.message}\`);
          } finally {
            this.disabled = false;
            this.innerHTML = '<i class="bi bi-calendar-x me-2"></i>Delete Schedule';
          }
        });


        // Refresh schedule stats button
        document.getElementById('refreshScheduleStatsButton').addEventListener('click', async function() {
          const originalHtml = this.innerHTML;
          this.disabled = true;
          this.innerHTML = '<i class="spinner-border spinner-border-sm me-1"></i>Refreshing...';
          
          await loadScheduleStats();
          
          this.disabled = false;
          this.innerHTML = originalHtml;
        });

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
          checkServiceStatus();
          updateSchedulesDisplay();
          
          // Load schedule stats initially
          loadScheduleStats();
          
          // Check status and refresh stats periodically
          setInterval(() => {
            checkServiceStatus();
            loadScheduleStats(); // Refresh stats periodically
          }, 30000); // Check every 30 seconds
        });
      `}} />

      <SwaggerEmbed serviceUrl="/api/scheduling" serviceName="Scheduling" />
    </>
  );
};

export default Scheduling;