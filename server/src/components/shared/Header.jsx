import React from 'react';

const Header = () => {
  return (
    <header className="app-header">
      <nav className="navbar navbar-expand-lg">
        <div className="container-fluid">
          <div className="d-flex align-items-center w-100">
            
            <a className="navbar-brand fw-medium me-3 d-flex align-items-center" href="/">
              <img src="/stech-black.png" alt="Architecture Artifacts" width="20" height="20" className="me-2" />
              Design Artifacts server.
            </a>
            
            <div className="ms-auto d-flex align-items-center gap-3">
              <div className="d-flex align-items-center">
                <div className="server-status-indicator" id="server-status-indicator" title="Server Status"></div>
                <span className="server-status-text ms-2" id="server-status-text">Checking...</span>
              </div>
              <button className="btn btn-outline-secondary btn-sm" onClick="logout()" title="Logout">
                <i className="bi bi-box-arrow-right me-1"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <style jsx>{`
        .server-status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #36b37e, #00875a);
          box-shadow: 0 0 8px rgba(54, 179, 126, 0.6);
          animation: pulse 2s infinite;
        }
        
        .server-status-indicator.offline {
          background: linear-gradient(135deg, #de350b, #bf2600);
          box-shadow: 0 0 8px rgba(222, 53, 11, 0.6);
        }
        
        .server-status-text {
          font-size: 0.875rem;
          font-weight: 500;
          color: #36b37e;
        }
        
        .server-status-text.offline {
          color: #de350b;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 8px rgba(54, 179, 126, 0.6);
          }
          50% {
            box-shadow: 0 0 16px rgba(54, 179, 126, 0.8);
          }
          100% {
            box-shadow: 0 0 8px rgba(54, 179, 126, 0.6);
          }
        }
        
        .btn-outline-secondary {
          border-color: #6c757d;
          color: #6c757d;
        }
        
        .btn-outline-secondary:hover {
          background-color: #6c757d;
          border-color: #6c757d;
          color: white;
        }
      `}</style>
    </header>
  );
};

export default Header;