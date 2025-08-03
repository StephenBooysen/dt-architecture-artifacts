import React, { useState, useEffect } from 'react';

const GitStatus = () => {
  const [spaceStatus, setSpaceStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSpaceStatus();
    const interval = setInterval(fetchSpaceStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSpaceStatus = async () => {
    try {
      const response = await fetch('/api/spaces/git-status');
      if (response.ok) {
        const data = await response.json();
        setSpaceStatus(data);
        setError(null);
      } else {
        setError('Failed to fetch git status');
      }
    } catch (err) {
      setError('Error fetching git status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResyncSpace = async (spaceName) => {
    try {
      const response = await fetch(`/api/spaces/${spaceName}/resync`, {
        method: 'POST'
      });
      
      if (response.ok) {
        showToast(`Space "${spaceName}" resynced successfully`, 'success');
        fetchSpaceStatus(); // Refresh status
      } else {
        const error = await response.text();
        showToast(`Failed to resync space: ${error}`, 'error');
      }
    } catch (err) {
      showToast('Error resyncing space', 'error');
    }
  };

  const handleCommitChanges = async (spaceName) => {
    const commitMessage = prompt('Enter commit message:');
    if (!commitMessage) return;

    try {
      const response = await fetch(`/api/spaces/${spaceName}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: commitMessage })
      });
      
      if (response.ok) {
        showToast(`Changes committed successfully for "${spaceName}"`, 'success');
        fetchSpaceStatus(); // Refresh status
      } else {
        const error = await response.text();
        showToast(`Failed to commit changes: ${error}`, 'error');
      }
    } catch (err) {
      showToast('Error committing changes', 'error');
    }
  };

  const handleForceReset = async (spaceName) => {
    if (!confirm(`Are you sure you want to force reset "${spaceName}"? This will discard all local changes.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/spaces/${spaceName}/force-reset`, {
        method: 'POST'
      });
      
      if (response.ok) {
        showToast(`Space "${spaceName}" reset successfully`, 'success');
        fetchSpaceStatus(); // Refresh status
      } else {
        const error = await response.text();
        showToast(`Failed to reset space: ${error}`, 'error');
      }
    } catch (err) {
      showToast('Error resetting space', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem;
      background: ${type === 'success' ? '#36b37e' : '#de350b'};
      color: white;
      border-radius: 4px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  if (loading) {
    return (
      <div className="content-header">
        <h1>
          <i className="bi bi-git"></i>
          Git Status
        </h1>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="spinner">Loading git status...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="content-header">
        <h1>
          <i className="bi bi-git"></i>
          Git Status & Space Management
          <div className="status-indicator" id="git-status"></div>
        </h1>
        <div className="header-actions">
          <p>Monitor Git repository status and manage space synchronization</p>
          <button className="btn btn-primary" onClick={fetchSpaceStatus}>
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh Status
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="git-status-section">
        <div className="git-status-grid">
          {Object.entries(spaceStatus).map(([spaceName, status]) => (
            <div key={spaceName} className="space-card">
              <div className="space-header">
                <h3>
                  <i className="bi bi-folder me-2"></i>
                  {spaceName}
                </h3>
                <div className={`space-status-indicator ${status.healthy ? 'healthy' : 'error'}`}>
                  {status.healthy ? 'Healthy' : 'Issues'}
                </div>
              </div>

              <div className="space-details">
                <div className="detail-row">
                  <span className="detail-label">Repository:</span>
                  <span className="detail-value">{status.repo || 'Unknown'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Branch:</span>
                  <span className="detail-value">{status.branch || 'Unknown'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Local Path:</span>
                  <span className="detail-value">{status.localPath || 'Unknown'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Last Sync:</span>
                  <span className="detail-value">
                    {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>

              {status.gitStatus && (
                <div className="git-info">
                  <h4>Git Information</h4>
                  <div className="git-details">
                    <div className="detail-row">
                      <span className="detail-label">Ahead:</span>
                      <span className="detail-value badge">{status.gitStatus.ahead || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Behind:</span>
                      <span className="detail-value badge">{status.gitStatus.behind || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Modified:</span>
                      <span className="detail-value badge">{status.gitStatus.modified?.length || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Untracked:</span>
                      <span className="detail-value badge">{status.gitStatus.not_added?.length || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {status.error && (
                <div className="error-section">
                  <h4>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Error Details
                  </h4>
                  <div className="error-message">
                    {status.error}
                  </div>
                  {status.error.includes('divergent branches') && (
                    <div className="solution-hint">
                      <strong>Solution:</strong> This error has been fixed by implementing the --merge strategy. 
                      Try resyncing the space to resolve divergent branches.
                    </div>
                  )}
                </div>
              )}

              <div className="space-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => handleResyncSpace(spaceName)}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Resync Space
                </button>
                
                {status.gitStatus && (status.gitStatus.modified?.length > 0 || status.gitStatus.not_added?.length > 0) && (
                  <button 
                    className="btn btn-success"
                    onClick={() => handleCommitChanges(spaceName)}
                  >
                    <i className="bi bi-check-circle me-1"></i>
                    Commit Changes
                  </button>
                )}
                
                {!status.healthy && (
                  <>
                    <button 
                      className="btn btn-warning"
                      onClick={() => handleResyncSpace(spaceName)}
                    >
                      <i className="bi bi-tools me-1"></i>
                      Force Sync
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleForceReset(spaceName)}
                    >
                      <i className="bi bi-arrow-counterclockwise me-1"></i>
                      Force Reset
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(spaceStatus).length === 0 && (
          <div className="no-spaces">
            <i className="bi bi-folder-x"></i>
            <h3>No spaces found</h3>
            <p>No Git spaces are currently configured or available.</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .git-status-section {
          padding: 1rem 0;
        }
        .git-status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }
        .space-card {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .space-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f4f5f7;
        }
        .space-header h3 {
          margin: 0;
          color: #172b4d;
          font-size: 1.25rem;
          font-weight: 600;
          display: flex;
          align-items: center;
        }
        .space-status-indicator {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .space-status-indicator.healthy {
          background: #e3fcef;
          color: #006644;
          border: 1px solid #36b37e;
        }
        .space-status-indicator.error {
          background: #ffebe6;
          color: #bf2600;
          border: 1px solid #de350b;
        }
        .space-details {
          margin-bottom: 1.5rem;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f4f5f7;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 500;
          color: #5e6c84;
        }
        .detail-value {
          color: #172b4d;
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
          font-size: 0.875rem;
        }
        .git-info {
          background: #f4f5f7;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .git-info h4 {
          margin: 0 0 0.75rem 0;
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
        }
        .git-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }
        .badge {
          background: #0052cc;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          min-width: 1.5rem;
          text-align: center;
        }
        .error-section {
          background: #ffebe6;
          border: 1px solid #de350b;
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .error-section h4 {
          margin: 0 0 0.75rem 0;
          color: #bf2600;
          font-size: 1rem;
          font-weight: 600;
        }
        .error-message {
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
          background: #fff;
          padding: 0.75rem;
          border-radius: 4px;
          color: #172b4d;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }
        .solution-hint {
          background: #e3fcef;
          border: 1px solid #36b37e;
          padding: 0.75rem;
          border-radius: 4px;
          color: #006644;
          font-size: 0.875rem;
        }
        .space-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .no-spaces {
          text-align: center;
          padding: 3rem;
          color: #5e6c84;
        }
        .no-spaces i {
          font-size: 3rem;
          margin-bottom: 1rem;
          display: block;
        }
        .no-spaces h3 {
          margin: 0.5rem 0;
          color: #172b4d;
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
        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-block;
          text-align: center;
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
        .btn-success {
          background: #36b37e;
          color: #ffffff;
        }
        .btn-success:hover {
          background: #57d9a3;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(54, 179, 126, 0.3);
        }
        .btn-warning {
          background: #ff8b00;
          color: #ffffff;
        }
        .btn-warning:hover {
          background: #ff991f;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(255, 139, 0, 0.3);
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
        .alert {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
        }
        .alert-danger {
          background: #ffebe6;
          border: 1px solid #de350b;
          color: #bf2600;
        }
        .spinner {
          color: #5e6c84;
          font-style: italic;
        }
      `}} />
    </>
  );
};

export default GitStatus;