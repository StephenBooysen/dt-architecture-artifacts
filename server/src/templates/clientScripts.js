/**
 * @fileoverview Client-side JavaScript generation for server pages.
 * Contains sidebar toggle, theme management, and API monitoring scripts.
 */

/**
 * Generates JavaScript code for sidebar toggle and server status functionality.
 * 
 * Provides client-side JavaScript for collapsing/expanding the sidebar,
 * handling logout functionality, checking server status, and updating
 * the status indicator in real-time.
 * 
 * @returns {string} JavaScript code as a string
 */
function getSidebarToggleScript() {
  return `
  <script>
    let sidebarCollapsed = false;
    
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const icon = document.getElementById('sidebar-toggle-icon');
      
      if (!sidebar) {
        console.error('Sidebar element not found');
        return;
      }
      
      if (!icon) {
        console.error('Sidebar toggle icon not found');
        return;
      }
      
      sidebarCollapsed = !sidebarCollapsed;
      
      if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        icon.className = 'bi bi-layout-sidebar';
      } else {
        sidebar.classList.remove('collapsed');
        icon.className = 'bi bi-aspect-ratio';
      }
    }
    
    // Ensure the function is available globally
    window.toggleSidebar = toggleSidebar;
    
    // Global logout function
    async function logout() {
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        
        if (response.ok) {          
          window.location.href = '/server-landing';
        } else {
          alert('Logout failed');
        }
      } catch (error) {
        alert('Network error during logout');
      }
    }
    
    // Global server status checking function
    async function checkServerStatus() {
      try {
        const response = await fetch('/api/server/status');
        const statusIndicator = document.getElementById('server-status-indicator');
        const statusText = document.getElementById('server-status-text');
        
        if (response.ok) {
          const data = await response.json();
          if (statusIndicator) {
            statusIndicator.classList.remove('offline');
            statusIndicator.title = \`Server Online - Uptime: \${Math.floor(data.uptime / 60)}m\`;
          }
          if (statusText) {
            statusText.classList.remove('offline');
            statusText.textContent = 'Server Online';
          }
        } else {
          throw new Error('Server status check failed');
        }
      } catch (error) {
        const statusIndicator = document.getElementById('server-status-indicator');
        const statusText = document.getElementById('server-status-text');
        if (statusIndicator) {
          statusIndicator.classList.add('offline');
          statusIndicator.title = 'Server Status Check Failed';
        }
        if (statusText) {
          statusText.classList.add('offline');
          statusText.textContent = 'Server Offline';
        }
      }
    }
    
    // Make functions globally available
    window.logout = logout;
    window.checkServerStatus = checkServerStatus;
    
    // Also add event listener approach as backup
    document.addEventListener('DOMContentLoaded', function() {
      const toggleBtn = document.querySelector('.sidebar-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
          e.preventDefault();
          toggleSidebar();
        });
      }
      
      // Initialize server status checking
      checkServerStatus();
      // Check status every 30 seconds
      setInterval(checkServerStatus, 30000);
    });
  </script>
  `;
}

/**
 * Generates JavaScript code for theme switching functionality.
 * 
 * Provides client-side JavaScript for toggling between light and dark themes,
 * persisting theme preference in localStorage, and updating theme icons
 * dynamically. Supports both manual theme switching and preference storage.
 * 
 * @returns {string} JavaScript code as a string
 */
function getThemeToggleScript() {
  return `
  <script>
    // Theme management
    function initTheme() {
      const savedTheme = localStorage.getItem('architecture-artifacts-theme');
      // Default to light theme regardless of system preference
      const theme = savedTheme || 'light';
      
      document.documentElement.setAttribute('data-theme', theme);
      updateThemeIcon(theme);
    }
    
    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('architecture-artifacts-theme', newTheme);
      updateThemeIcon(newTheme);
    }
    
    function updateThemeIcon(theme) {
      const icon = document.getElementById('theme-toggle-icon');
      if (icon) {
        if (theme === 'dark') {
          icon.className = 'bi bi-sun';
        } else {
          icon.className = 'bi bi-moon';
        }
      }
    }
    
    // Initialize theme on load
    document.addEventListener('DOMContentLoaded', function() {
      initTheme();
    });
    
    // Make function available globally
    window.toggleTheme = toggleTheme;
  </script>
  `;
}

/**
 * Generates JavaScript code for the API monitoring dashboard.
 * 
 * Provides comprehensive client-side functionality for the API monitoring
 * interface including data fetching, statistics calculation, table filtering,
 * auto-refresh capabilities, and test API calls. Handles real-time updates
 * and interactive controls for monitoring server API usage.
 * 
 * @returns {string} JavaScript code as a string
 */
function getMonitoringScript() {
  return `<script>
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
        console.error('Failed to fetch API calls:', error);
        document.getElementById('stats').innerHTML = \`
          <div class="stat-card" style="background: rgba(231, 76, 60, 0.8);">
            <h3>Error</h3>
            <p>Failed to load API data</p>
          </div>
        \`;
      }
    }

    function updateStats(calls) {
      console.log('Updating stats with', calls.length, 'calls');
      const totalCalls = calls.length;
      const successCalls = calls.filter(c => c.statusCode >= 200 && c.statusCode < 300).length;
      const errorCalls = calls.filter(c => c.statusCode >= 400).length;
      const avgDuration = calls.length > 0 ? Math.round(calls.reduce((sum, c) => sum + c.duration, 0) / calls.length) : 0;

      const statsElement = document.getElementById('stats');
      if (!statsElement) {
        console.error('Stats element not found!');
        return;
      }
      
      statsElement.innerHTML = 
        '<div class="stat-card">' +
          '<h3>' + totalCalls + '</h3>' +
          '<p>Total API Calls</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<h3>' + successCalls + '</h3>' +
          '<p>Successful Calls</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<h3>' + errorCalls + '</h3>' +
          '<p>Error Calls</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<h3>' + avgDuration + 'ms</h3>' +
          '<p>Avg Duration</p>' +
        '</div>';
      
      console.log('Stats updated successfully');
    }

    function filterCalls() {
      const methodFilter = document.getElementById('methodFilter').value;
      const statusFilter = document.getElementById('statusFilter').value;

      let filteredCalls = allCalls;

      if (methodFilter) {
        filteredCalls = filteredCalls.filter(call => call.method === methodFilter);
      }

      if (statusFilter) {
        filteredCalls = filteredCalls.filter(call => {
          const statusClass = Math.floor(call.statusCode / 100);
          return statusClass.toString() === statusFilter;
        });
      }

      updateTable(filteredCalls);
    }

    function updateTable(calls) {
      console.log('Updating table with', calls.length, 'calls');
      const tbody = document.getElementById('tableBody');
      if (!tbody) {
        console.error('Table body element not found!');
        return;
      }
      
      if (calls.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #7f8c8d;">No API calls recorded yet. Make some API requests to see data here.</td></tr>';
        return;
      }
      
      const rows = calls.map(call => {
        return '<tr>' +
          '<td class="timestamp">' + formatTime(call.timestamp) + '</td>' +
          '<td><span class="method-badge method-' + call.method.toLowerCase() + '">' + call.method + '</span></td>' +
          '<td>' + call.url + '</td>' +
          '<td><span class="status-badge status-' + Math.floor(call.statusCode/100) + 'xx">' + call.statusCode + '</span></td>' +
          '<td class="duration">' + call.duration + 'ms</td>' +
          '<td>' + formatBytes(call.responseSize) + '</td>' +
          '<td>' + (call.ip || 'Unknown') + '</td>' +
        '</tr>';
      });
      
      tbody.innerHTML = rows.join('');
      console.log('Table updated successfully');
    }

    function formatTime(timestamp) {
      return new Date(timestamp).toLocaleString();
    }

    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function refreshData() {
      fetchApiCalls();
    }
    
    async function testApiCall() {
      console.log('Making test API call...');
      try {
        const response = await fetch('/api/files');
        console.log('Test API call completed:', response.status);
        setTimeout(() => fetchApiCalls(), 1000);
      } catch (error) {
        console.error('Test API call failed:', error);
      }
    }

    function toggleAutoRefresh() {
      const autoRefreshCheckbox = document.getElementById('autoRefresh');
      if (autoRefreshCheckbox.checked) {
        autoRefreshInterval = setInterval(fetchApiCalls, 5000);
      } else {
        clearInterval(autoRefreshInterval);
      }
    }

    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh();
    });
    
    if (document.readyState !== 'loading') {
      console.log('DOM already loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh();
    }
  </script>`;
}

module.exports = {
  getSidebarToggleScript,
  getThemeToggleScript,
  getMonitoringScript
};