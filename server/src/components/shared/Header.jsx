import React from 'react';

const Header = () => {
  return (
    <header className="app-header">
      <nav className="navbar navbar-expand-lg">
        <div className="container-fluid">
          <div className="d-flex align-items-center w-100">
            <button
              className="btn btn-secondary btn-sm sidebar-toggle me-3"
              onClick="toggleSidebar()"
              title="Toggle sidebar"
            >
              <i className="bi bi-list" id="sidebar-toggle-icon"></i>
            </button>
            
            <a className="navbar-brand fw-medium me-3" href="/">
              Architecture Artifacts Server
            </a>
            
            <div className="ms-auto">
              <span className="badge bg-success">Server Running</span>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;