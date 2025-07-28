import React from 'react';

const Sidebar = ({ activeSection }) => {
  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h2>
            <i className="bi bi-building me-2"></i>
            Navigation
          </h2>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Overview</div>
            <a 
              href="/" 
              className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            >
              <i className="bi bi-speedometer2 me-2"></i>
              Dashboard
            </a>
          </div>
          
          <div className="nav-section">
            <div className="nav-section-title">Settings</div>
            <a 
              href="/settings" 
              className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
            >
              <i className="bi bi-git me-2"></i>
              Git Repository
            </a>
          </div>
          
          <div className="nav-section">
            <div className="nav-section-title">Monitoring</div>
            <a 
              href="/monitoring/api" 
              className={`nav-item ${activeSection === 'monitoring' ? 'active' : ''}`}
            >
              <i className="bi bi-graph-up me-2"></i>
              API Monitor
            </a>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;