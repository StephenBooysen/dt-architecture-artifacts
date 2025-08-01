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
        
        <div className="overview-section">
          <h2>Microservices Status</h2>
          <div className="services-grid" id="services-grid">
            <div className="service-card" data-service="logging">
              <div className="service-icon">
                <i className="bi bi-list-columns-reverse"></i>
              </div>
              <div className="service-info">
                <h3>Logging</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-logging"></div>
                  <span className="status-text" id="status-text-logging">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="caching">
              <div className="service-icon">
                <i className="bi bi-database-check"></i>
              </div>
              <div className="service-info">
                <h3>Caching</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-caching"></div>
                  <span className="status-text" id="status-text-caching">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="filing">
              <div className="service-icon">
                <i className="bi bi-folder-check"></i>
              </div>
              <div className="service-info">
                <h3>Filing</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-filing"></div>
                  <span className="status-text" id="status-text-filing">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="dataserve">
              <div className="service-icon">
                <i className="bi bi-server"></i>
              </div>
              <div className="service-info">
                <h3>DataServe</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-dataserve"></div>
                  <span className="status-text" id="status-text-dataserve">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="queueing">
              <div className="service-icon">
                <i className="bi bi-stack"></i>
              </div>
              <div className="service-info">
                <h3>Queueing</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-queueing"></div>
                  <span className="status-text" id="status-text-queueing">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="measuring">
              <div className="service-icon">
                <i className="bi bi-speedometer2"></i>
              </div>
              <div className="service-info">
                <h3>Measuring</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-measuring"></div>
                  <span className="status-text" id="status-text-measuring">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="notifying">
              <div className="service-icon">
                <i className="bi bi-envelope-check"></i>
              </div>
              <div className="service-info">
                <h3>Notifying</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-notifying"></div>
                  <span className="status-text" id="status-text-notifying">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="scheduling">
              <div className="service-icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <div className="service-info">
                <h3>Scheduling</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-scheduling"></div>
                  <span className="status-text" id="status-text-scheduling">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="searching">
              <div className="service-icon">
                <i className="bi bi-search"></i>
              </div>
              <div className="service-info">
                <h3>Searching</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-searching"></div>
                  <span className="status-text" id="status-text-searching">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="workflow">
              <div className="service-icon">
                <i className="bi bi-bounding-box"></i>
              </div>
              <div className="service-info">
                <h3>Workflow</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-workflow"></div>
                  <span className="status-text" id="status-text-workflow">Checking...</span>
                </div>
              </div>
            </div>
            
            <div className="service-card" data-service="working">
              <div className="service-icon">
                <i className="bi bi-gear-wide"></i>
              </div>
              <div className="service-info">
                <h3>Working</h3>
                <div className="service-status">
                  <div className="status-indicator checking" id="status-working"></div>
                  <span className="status-text" id="status-text-working">Checking...</span>
                </div>
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
        
        /* Services Grid Styles */
        .services-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        
        @media (max-width: 1200px) {
          .services-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .services-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 480px) {
          .services-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .service-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: #f4f5f7;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .service-card:hover {
          background: #e4edfc;
          border-color: #0052cc;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .service-icon {
          font-size: 1.5rem;
          color: #0052cc;
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(0, 82, 204, 0.1);
        }
        
        .service-info {
          flex: 1;
          min-width: 0;
        }
        
        .service-info h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .service-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .status-indicator.online {
          background: #36b37e;
          box-shadow: 0 0 8px rgba(54, 179, 126, 0.6);
          animation: pulse-green 2s infinite;
        }
        
        .status-indicator.offline {
          background: #de350b;
          box-shadow: 0 0 8px rgba(222, 53, 11, 0.6);
          animation: pulse-red 2s infinite;
        }
        
        .status-indicator.checking {
          background: #ffab00;
          box-shadow: 0 0 8px rgba(255, 171, 0, 0.6);
          animation: pulse-yellow 2s infinite;
        }
        
        .status-text {
          font-size: 0.75rem;
          font-weight: 500;
          color: #5e6c84;
        }
        
        .status-text.online {
          color: #36b37e;
        }
        
        .status-text.offline {
          color: #de350b;
        }
        
        .status-text.checking {
          color: #ffab00;
        }
        
        @keyframes pulse-green {
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
        
        @keyframes pulse-red {
          0% {
            box-shadow: 0 0 8px rgba(222, 53, 11, 0.6);
          }
          50% {
            box-shadow: 0 0 16px rgba(222, 53, 11, 0.8);
          }
          100% {
            box-shadow: 0 0 8px rgba(222, 53, 11, 0.6);
          }
        }
        
        @keyframes pulse-yellow {
          0% {
            box-shadow: 0 0 8px rgba(255, 171, 0, 0.6);
          }
          50% {
            box-shadow: 0 0 16px rgba(255, 171, 0, 0.8);
          }
          100% {
            box-shadow: 0 0 8px rgba(255, 171, 0, 0.6);
          }
        }
      `}} />
      
      <script dangerouslySetInnerHTML={{__html: `
        // Service status checking
        const services = [
          'logging', 'caching', 'filing', 'dataserve', 
          'queueing', 'measuring', 'notifying', 'scheduling', 
          'searching', 'workflow', 'working'
        ];
        
        async function checkServiceStatus(serviceName) {
          try {
            const response = await fetch('/api/' + serviceName + '/status');
            const statusIndicator = document.getElementById('status-' + serviceName);
            const statusText = document.getElementById('status-text-' + serviceName);
            
            if (response.ok) {
              statusIndicator.className = 'status-indicator online';
              statusText.className = 'status-text online';
              statusText.textContent = 'Online';
            } else {
              throw new Error('Service returned error status');
            }
          } catch (error) {
            const statusIndicator = document.getElementById('status-' + serviceName);
            const statusText = document.getElementById('status-text-' + serviceName);
            statusIndicator.className = 'status-indicator offline';
            statusText.className = 'status-text offline';
            statusText.textContent = 'Offline';
          }
        }
        
        async function checkAllServices() {
          for (const service of services) {
            await checkServiceStatus(service);
          }
        }
        
        // Add click handlers to service cards
        function addServiceClickHandlers() {
          services.forEach(service => {
            const card = document.querySelector('[data-service="' + service + '"]');
            if (card) {
              card.addEventListener('click', () => {
                window.location.href = '/services/' + service;
              });
            }
          });
        }
        
        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
          checkAllServices();
          addServiceClickHandlers();
          
          // Check service status every 30 seconds
          setInterval(checkAllServices, 30000);
        });
        
        // Also run if DOM is already loaded
        if (document.readyState !== 'loading') {
          checkAllServices();
          addServiceClickHandlers();
          setInterval(checkAllServices, 30000);
        }
      `}} />
    </>
  );
};

export default Dashboard;