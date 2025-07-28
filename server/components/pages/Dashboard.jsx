import React from 'react';

const Dashboard = () => {
  return (
    <>
      <div className="content-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your Architecture Artifacts system</p>
        </div>
      </div>
      
      <div className="dashboard-overview">
        <div className="overview-section">
          <h2>Quick Actions</h2>
          <div className="action-grid">
            <a href="/settings" className="action-card">
              <div className="action-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Configure Git repository and system settings</p>
            </a>
            
            <a href="/monitoring/api" className="action-card">
              <div className="action-icon">📊</div>
              <h3>API Monitor</h3>
              <p>Monitor API calls and system performance</p>
            </a>
          </div>
        </div>
        
        <div className="overview-section">
          <h2>System Status</h2>
          <div className="status-grid">
            <div className="status-card">
              <div className="status-indicator green"></div>
              <div className="status-content">
                <h3>Server Status</h3>
                <p>Running normally</p>
              </div>
            </div>
            
            <div className="status-card">
              <div className="status-indicator blue"></div>
              <div className="status-content">
                <h3>API Endpoints</h3>
                <p>All endpoints operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .dashboard-overview {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .overview-section {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        
        .overview-section h2 {
          color: #172b4d;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
        
        .action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        
        .action-card {
          display: block;
          padding: 1.5rem;
          background: #f4f5f7;
          border: 1px solid #dfe1e6;
          border-radius: 6px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
        }
        
        .action-card:hover {
          background: #e4edfc;
          border-color: #0052cc;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .action-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        
        .action-card h3 {
          color: #172b4d;
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .action-card p {
          color: #5e6c84;
          font-size: 0.875rem;
          margin: 0;
        }
        
        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .status-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f4f5f7;
          border: 1px solid #dfe1e6;
          border-radius: 6px;
        }
        
        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .status-indicator.green {
          background: #36b37e;
        }
        
        .status-indicator.blue {
          background: #0052cc;
        }
        
        .status-content h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .status-content p {
          color: #5e6c84;
          font-size: 0.875rem;
          margin: 0;
        }
      `}} />
    </>
  );
};

export default Dashboard;