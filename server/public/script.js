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
    document.getElementById('stats').innerHTML = `
      <div class="stat-card" style="background: rgba(231, 76, 60, 0.8);">
        <h3>Error</h3>
        <p>Failed to load API data</p>
      </div>
    `;
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

document.getElementById('cloneForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const repoUrl = document.getElementById('repo-url').value;
  const branch = document.getElementById('branch').value;
  
  try {
    const response = await fetch('/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl, branch })
    });
    
    if (response.ok) {
      alert('Repository cloned successfully');
      document.getElementById('repo-url').value = '';
    } else {
      const error = await response.json();
      alert('Error: ' + error.error);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
});

document.getElementById('pullBtn').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: 'main' })
    });
    
    if (response.ok) {
      alert('Repository updated successfully');
    } else {
      const error = await response.json();
      alert('Error: ' + error.error);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
});
