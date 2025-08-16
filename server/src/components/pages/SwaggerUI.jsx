import React from 'react';

const SwaggerUI = () => {
  return (
    <>
      <div className="content-header">
        <div>
          <h1>API Documentation</h1>
          <p>Interactive API documentation for all services</p>
        </div>
      </div>
      
      <div className="swagger-overview-section">
        <h2>Available APIs</h2>
        <div className="services-grid">
          <div className="service-card">
            <h3>Caching Service</h3>
            <p>Multi-provider caching API (Redis, Memcached, In-memory)</p>
            <div className="service-actions">
              <a href="/services/caching" className="btn btn-primary">View Service UI</a>
              <a href="/api/caching/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>Filing Service</h3>
            <p>File storage API (Local, FTP, S3, Git)</p>
            <div className="service-actions">
              <a href="/services/filing" className="btn btn-primary">View Service UI</a>
              <a href="/api/filing/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>Logging Service</h3>
            <p>Structured logging API with multiple output targets</p>
            <div className="service-actions">
              <a href="/services/logging" className="btn btn-primary">View Service UI</a>
              <a href="/api/logging/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>Searching Service</h3>
            <p>JSON data storage and text search API</p>
            <div className="service-actions">
              <a href="/services/searching" className="btn btn-primary">View Service UI</a>
              <a href="/api/searching/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>DataServe Service</h3>
            <p>Database operations and data management API</p>
            <div className="service-actions">
              <a href="/services/dataserve" className="btn btn-primary">View Service UI</a>
              <a href="/api/dataserve/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>Queueing Service</h3>
            <p>Message queue management API</p>
            <div className="service-actions">
              <a href="/services/queueing" className="btn btn-primary">View Service UI</a>
              <a href="/api/queueing/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>Measuring Service</h3>
            <p>Metrics collection and monitoring API</p>
            <div className="service-actions">
              <a href="/services/measuring" className="btn btn-primary">View Service UI</a>
              <a href="/api/measuring/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>Notifying Service</h3>
            <p>Multi-channel notification system API</p>
            <div className="service-actions">
              <a href="/services/notifying" className="btn btn-primary">View Service UI</a>
              <a href="/api/notifying/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>Scheduling Service</h3>
            <p>Cron-based task scheduling API</p>
            <div className="service-actions">
              <a href="/services/scheduling" className="btn btn-primary">View Service UI</a>
              <a href="/api/scheduling/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>Working Service</h3>
            <p>Background worker processes API</p>
            <div className="service-actions">
              <a href="/services/working" className="btn btn-primary">View Service UI</a>
              <a href="/api/working/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
          
          <div className="service-card">
            <h3>Workflow Service</h3>
            <p>Step-based workflow engine API</p>
            <div className="service-actions">
              <a href="/services/workflow" className="btn btn-primary">View Service UI</a>
              <a href="/api/workflow/openapi.json" className="btn btn-outline-secondary" target="_blank">View OpenAPI Spec</a>
            </div>
          </div>
        </div>
      </div>
      
      <div className="swagger-documentation-section">
        <h2>Core API Documentation</h2>
        <div className="swagger-embed-container">
          <div id="swagger-ui-main"></div>
        </div>
      </div>
      
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
      
      <script dangerouslySetInnerHTML={{__html: `
        function initMainSwaggerUI() {
          if (typeof SwaggerUIBundle === 'undefined') {
            console.log('SwaggerUIBundle not loaded yet, retrying...');
            setTimeout(initMainSwaggerUI, 1000);
            return;
          }

          try {
            const ui = SwaggerUIBundle({
              url: '/openapi/swagger.json',
              dom_id: '#swagger-ui-main',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
              ],
              layout: "StandaloneLayout",
              validatorUrl: null,
              tryItOutEnabled: true,
              requestInterceptor: (request) => {
                request.credentials = 'include';
                return request;
              },
              onComplete: () => {
                console.log('Main Swagger UI loaded successfully');
              },
              onFailure: (error) => {
                console.error('Main Swagger UI failed to load:', error);
                document.getElementById('swagger-ui-main').innerHTML = 
                  '<div class="alert alert-warning text-center p-4">' +
                  '<h4>API Documentation Unavailable</h4>' +
                  '<p>The main API documentation is not available. You can access individual service APIs using the links above.</p>' +
                  '</div>';
              }
            });
          } catch (error) {
            console.error('Error initializing main Swagger UI:', error);
            document.getElementById('swagger-ui-main').innerHTML = 
              '<div class="alert alert-info text-center p-4">' +
              '<h4>Service APIs Available</h4>' +
              '<p>Individual service APIs are available through their respective service pages. Use the cards above to access specific API documentation.</p>' +
              '</div>';
          }
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initMainSwaggerUI);
        } else {
          initMainSwaggerUI();
        }
      `}} />
      
      <style dangerouslySetInnerHTML={{__html: `
        .swagger-overview-section {
          margin-bottom: 3rem;
        }
        
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        
        .service-card {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }
        
        .service-card:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
        
        .service-card h3 {
          color: #172b4d;
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .service-card p {
          color: #5e6c84;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          line-height: 1.5;
        }
        
        .service-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          border: 1px solid;
          transition: all 0.2s ease;
          display: inline-block;
        }
        
        .btn-primary {
          background-color: #0052cc;
          border-color: #0052cc;
          color: white;
        }
        
        .btn-primary:hover {
          background-color: #0043a3;
          border-color: #0043a3;
          color: white;
          text-decoration: none;
        }
        
        .btn-outline-secondary {
          background-color: transparent;
          border-color: #dfe1e6;
          color: #172b4d;
        }
        
        .btn-outline-secondary:hover {
          background-color: #f1f2f4;
          border-color: #c1c7d0;
          color: #172b4d;
          text-decoration: none;
        }
        
        .swagger-documentation-section h2 {
          color: #172b4d;
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
        
        .swagger-embed-container {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          min-height: 400px;
          overflow: hidden;
        }
        
        #swagger-ui-main .swagger-ui {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }
        
        #swagger-ui-main .topbar {
          display: none;
        }
        
        @media (max-width: 768px) {
          .services-grid {
            grid-template-columns: 1fr;
          }
          
          .service-actions {
            flex-direction: column;
          }
          
          .service-actions .btn {
            text-align: center;
          }
        }
      `}} />
    </>
  );
};

export default SwaggerUI;