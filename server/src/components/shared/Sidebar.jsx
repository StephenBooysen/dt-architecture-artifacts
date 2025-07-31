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
            <div className="nav-section-title">Services</div>
            <a 
              href="/services/logging" 
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
            >
              <i className="bi bi-list-columns-reverse me-2"></i>
              Logging
            </a>
            <a 
              href="/services/caching" 
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
            >
              <i className="bi bi-database-check me-2"></i>
              Caching
            </a>
            <a 
              href="/services/queueing" 
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
            >
              <i className="bi bi-stack me-2"></i>
              Queueing
            </a>
            <a 
              href="/services/measuring" 
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
            >
              <i className="bi bi-speedometer2 me-2"></i>
              Measuring
            </a>
            <a 
              href="/services/notifying" 
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
            >
              <i className="bi bi-envelope-check me-2"></i>
              Notifying
            </a>
            <a 
              href="/services/scheduling" 
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
            >
              <i className="bi bi-clock-history me-2"></i>
              Scheduling
            </a>
            <a 
              href="/services/searching" 
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
            >
              <i className="bi bi-search me-2"></i>
              Searching
            </a>
            <a 
              href="/services/workflow" 
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
            >
              <i className="bi bi-bounding-box me-2"></i>
              Workflow
            </a>
            <a 
              href="/services/working" 
              className={`nav-item ${activeSection === 'services' ? 'active' : ''}`}
            >
              <i className="bi bi-gear-wide me-2"></i>
              Working
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