import React from 'react';

const SwaggerUI = () => {
  return (
    <>
      <div className="content-header">
        <h1>Test APIs</h1>
        <p>Interactive API documentation and testing interface</p>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick="refreshSwagger()">
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      <div className="swagger-container">
        <div id="swagger-ui"></div>
      </div>
      
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
      
      <script dangerouslySetInnerHTML={{__html: `
        function initSwaggerUI() {
          // Check if SwaggerUIBundle is available
          if (typeof SwaggerUIBundle === 'undefined') {
            console.error('SwaggerUIBundle is not loaded yet');
            document.getElementById('swagger-ui').innerHTML = 
              '<div class="alert alert-warning text-center p-4">' +
              '<div class="spinner-border mb-3" role="status"></div>' +
              '<p>Loading Swagger UI resources...</p>' +
              '</div>';
            
            // Retry after a delay
            setTimeout(initSwaggerUI, 1000);
            return;
          }

          try {
            const ui = SwaggerUIBundle({
              url: '/api-spec/swagger.json',
              dom_id: '#swagger-ui',
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
                // Ensure credentials are included for session-based auth
                request.credentials = 'include';
                return request;
              },
              responseInterceptor: (response) => {
                return response;
              },
              onComplete: () => {
                console.log('Swagger UI loaded successfully');
              },
              onFailure: (error) => {
                console.error('Swagger UI failed to load:', error);
                document.getElementById('swagger-ui').innerHTML = 
                  '<div class="alert alert-danger m-4" role="alert">' +
                  '<h4 class="alert-heading">Failed to Load API Documentation</h4>' +
                  '<p>There was an error loading the API specification:</p>' +
                  '<hr>' +
                  '<p class="mb-3">' + (error.message || 'Unknown error occurred') + '</p>' +
                  '<button class="btn btn-outline-danger" onclick="refreshSwagger()">' +
                  '<i class="bi bi-arrow-clockwise me-1"></i> Try Again' +
                  '</button>' +
                  '</div>';
              }
            });
            
            // Store reference for refresh functionality
            window.swaggerUI = ui;
          } catch (error) {
            console.error('Error initializing Swagger UI:', error);
            document.getElementById('swagger-ui').innerHTML = 
              '<div class="alert alert-danger m-4" role="alert">' +
              '<h4 class="alert-heading">Initialization Error</h4>' +
              '<p>Failed to initialize Swagger UI: ' + error.message + '</p>' +
              '<button class="btn btn-outline-danger" onclick="refreshSwagger()">' +
              '<i class="bi bi-arrow-clockwise me-1"></i> Try Again' +
              '</button>' +
              '</div>';
          }
        }
        
        function refreshSwagger() {
          console.log('Refreshing Swagger UI...');
          // Clear the container
          document.getElementById('swagger-ui').innerHTML = 
            '<div class="text-center p-4">' +
            '<div class="spinner-border text-primary" role="status"></div>' +
            '<p class="mt-2">Refreshing API documentation...</p>' +
            '</div>';
          
          // Reinitialize after a short delay
          setTimeout(initSwaggerUI, 1000);
        }

        // Wait for scripts to load before initializing
        function waitForSwaggerScripts() {
          if (typeof SwaggerUIBundle !== 'undefined' && typeof SwaggerUIStandalonePreset !== 'undefined') {
            initSwaggerUI();
          } else {
            console.log('Waiting for Swagger UI scripts to load...');
            setTimeout(waitForSwaggerScripts, 500);
          }
        }

        // Start checking for scripts after DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', waitForSwaggerScripts);
        } else {
          waitForSwaggerScripts();
        }
      `}} />
      
      <style dangerouslySetInnerHTML={{__html: `
        .swagger-container {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          min-height: 600px;
          overflow: hidden;
        }

        /* Custom Swagger UI styling to match our theme */
        #swagger-ui .swagger-ui {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        #swagger-ui .topbar {
          background-color: var(--confluence-primary);
        }

        #swagger-ui .topbar .download-url-wrapper {
          display: none;
        }

        #swagger-ui .info .title {
          color: var(--confluence-text);
          font-size: 2rem;
          font-weight: 600;
        }

        #swagger-ui .info .description {
          color: var(--confluence-text-subtle);
        }

        #swagger-ui .opblock-tag {
          border-bottom: 1px solid var(--confluence-border);
          background: var(--confluence-bg-card);
        }

        #swagger-ui .opblock-tag:hover {
          background: var(--confluence-border-subtle);
        }

        #swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #36b37e;
        }

        #swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #0052cc;
        }

        #swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #ff8b00;
        }

        #swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #de350b;
        }

        #swagger-ui .opblock.opblock-patch .opblock-summary-method {
          background: #6554c0;
        }

        #swagger-ui .btn.authorize {
          background-color: var(--confluence-primary);
          border-color: var(--confluence-primary);
        }

        #swagger-ui .btn.authorize:hover {
          background-color: var(--confluence-primary-hover);
        }

        #swagger-ui .btn.try-out__btn {
          background-color: var(--confluence-primary);
          border-color: var(--confluence-primary);
          color: white;
        }

        #swagger-ui .btn.try-out__btn:hover {
          background-color: var(--confluence-primary-hover);
        }

        #swagger-ui .btn.execute {
          background-color: var(--confluence-success);
          border-color: var(--confluence-success);
        }

        #swagger-ui .response-col_status {
          font-weight: 600;
        }

        #swagger-ui .response.highlighted {
          border: 2px solid var(--confluence-primary);
        }

        /* Dark theme adjustments */
        [data-theme="dark"] #swagger-ui {
          filter: invert(1) hue-rotate(180deg);
        }

        [data-theme="dark"] #swagger-ui img,
        [data-theme="dark"] #swagger-ui .swagger-ui .info .title,
        [data-theme="dark"] #swagger-ui .swagger-ui .scheme-container {
          filter: invert(1) hue-rotate(180deg);
        }

        /* Loading state */
        .swagger-container .spinner-border {
          color: var(--confluence-primary);
        }

        /* Error state */
        .swagger-container .alert-danger {
          margin: 2rem;
          border-radius: 8px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .swagger-container {
            margin: 0 -1rem;
            border-left: none;
            border-right: none;
            border-radius: 0;
          }
          
          #swagger-ui .swagger-ui .wrapper {
            padding: 0 1rem;
          }
        }
      `}} />
    </>
  );
};

export default SwaggerUI;