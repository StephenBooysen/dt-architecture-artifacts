import React from 'react';

const SwaggerEmbed = ({ serviceUrl, serviceName }) => {
  const swaggerContainerId = `swagger-ui-${serviceName.toLowerCase()}`;
  
  return (
    <>
      <div className="swagger-embed-section">
        <h3>API Documentation</h3>
        <div className="swagger-embed-container">
          <div id={swaggerContainerId}></div>
        </div>
      </div>
      
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
      
      <script dangerouslySetInnerHTML={{__html: `
        function initSwaggerUI_${serviceName}() {
          // Check if SwaggerUIBundle is available
          if (typeof SwaggerUIBundle === 'undefined') {
            console.error('SwaggerUIBundle is not loaded yet for ${serviceName}');
            document.getElementById('${swaggerContainerId}').innerHTML = 
              '<div class="alert alert-warning text-center p-4">' +
              '<div class="spinner-border mb-3" role="status"></div>' +
              '<p>Loading Swagger UI resources...</p>' +
              '</div>';
            
            // Retry after a delay
            setTimeout(initSwaggerUI_${serviceName}, 1000);
            return;
          }

          try {
            const ui = SwaggerUIBundle({
              url: '${serviceUrl}/openapi.json',
              dom_id: '#${swaggerContainerId}',
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
                console.log('Swagger UI loaded successfully for ${serviceName}');
              },
              onFailure: (error) => {
                console.error('Swagger UI failed to load for ${serviceName}:', error);
                document.getElementById('${swaggerContainerId}').innerHTML = 
                  '<div class="alert alert-danger m-4" role="alert">' +
                  '<h4 class="alert-heading">Failed to Load API Documentation</h4>' +
                  '<p>There was an error loading the API specification:</p>' +
                  '<hr>' +
                  '<p class="mb-3">' + (error.message || 'Unknown error occurred') + '</p>' +
                  '<button class="btn btn-outline-danger" onclick="refreshSwagger_${serviceName}()">' +
                  '<i class="bi bi-arrow-clockwise me-1"></i> Try Again' +
                  '</button>' +
                  '</div>';
              }
            });
            
            // Store reference for refresh functionality
            window.swaggerUI_${serviceName} = ui;
          } catch (error) {
            console.error('Error initializing Swagger UI for ${serviceName}:', error);
            document.getElementById('${swaggerContainerId}').innerHTML = 
              '<div class="alert alert-danger m-4" role="alert">' +
              '<h4 class="alert-heading">Initialization Error</h4>' +
              '<p>Failed to initialize Swagger UI: ' + error.message + '</p>' +
              '<button class="btn btn-outline-danger" onclick="refreshSwagger_${serviceName}()">' +
              '<i class="bi bi-arrow-clockwise me-1"></i> Try Again' +
              '</button>' +
              '</div>';
          }
        }
        
        function refreshSwagger_${serviceName}() {
          console.log('Refreshing Swagger UI for ${serviceName}...');
          // Clear the container
          document.getElementById('${swaggerContainerId}').innerHTML = 
            '<div class="text-center p-4">' +
            '<div class="spinner-border text-primary" role="status"></div>' +
            '<p class="mt-2">Refreshing API documentation...</p>' +
            '</div>';
          
          // Reinitialize after a short delay
          setTimeout(initSwaggerUI_${serviceName}, 1000);
        }

        // Wait for scripts to load before initializing
        function waitForSwaggerScripts_${serviceName}() {
          if (typeof SwaggerUIBundle !== 'undefined' && typeof SwaggerUIStandalonePreset !== 'undefined') {
            initSwaggerUI_${serviceName}();
          } else {
            console.log('Waiting for Swagger UI scripts to load for ${serviceName}...');
            setTimeout(waitForSwaggerScripts_${serviceName}, 500);
          }
        }

        // Start checking for scripts after DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', waitForSwaggerScripts_${serviceName});
        } else {
          waitForSwaggerScripts_${serviceName}();
        }
      `}} />
      
      <style dangerouslySetInnerHTML={{__html: `
        .swagger-embed-section {
          margin-top: 2rem;
        }
        
        .swagger-embed-section h3 {
          color: #172b4d;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        
        .swagger-embed-container {
          background: #ffffff;
          border: 1px solid #dfe1e6;
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          min-height: 600px;
          overflow: hidden;
        }

        /* Custom Swagger UI styling to match our theme */
        #${swaggerContainerId} .swagger-ui {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        #${swaggerContainerId} .topbar {
          display: none;
        }

        #${swaggerContainerId} .info .title {
          color: var(--confluence-text, #172b4d);
          font-size: 1.5rem;
          font-weight: 600;
        }

        #${swaggerContainerId} .info .description {
          color: var(--confluence-text-subtle, #5e6c84);
        }

        #${swaggerContainerId} .opblock-tag {
          border-bottom: 1px solid var(--confluence-border, #dfe1e6);
          background: var(--confluence-bg-card, #ffffff);
        }

        #${swaggerContainerId} .opblock-tag:hover {
          background: var(--confluence-border-subtle, #f1f2f4);
        }

        #${swaggerContainerId} .opblock.opblock-get .opblock-summary-method {
          background: #36b37e;
        }

        #${swaggerContainerId} .opblock.opblock-post .opblock-summary-method {
          background: #0052cc;
        }

        #${swaggerContainerId} .opblock.opblock-put .opblock-summary-method {
          background: #ff8b00;
        }

        #${swaggerContainerId} .opblock.opblock-delete .opblock-summary-method {
          background: #de350b;
        }

        #${swaggerContainerId} .opblock.opblock-patch .opblock-summary-method {
          background: #6554c0;
        }

        #${swaggerContainerId} .btn.authorize {
          background-color: var(--confluence-primary, #0052cc);
          border-color: var(--confluence-primary, #0052cc);
        }

        #${swaggerContainerId} .btn.authorize:hover {
          background-color: var(--confluence-primary-hover, #0043a3);
        }

        #${swaggerContainerId} .btn.try-out__btn {
          background-color: var(--confluence-primary, #0052cc);
          border-color: var(--confluence-primary, #0052cc);
          color: white;
        }

        #${swaggerContainerId} .btn.try-out__btn:hover {
          background-color: var(--confluence-primary-hover, #0043a3);
        }

        #${swaggerContainerId} .btn.execute {
          background-color: var(--confluence-success, #36b37e);
          border-color: var(--confluence-success, #36b37e);
        }

        #${swaggerContainerId} .response-col_status {
          font-weight: 600;
        }

        #${swaggerContainerId} .response.highlighted {
          border: 2px solid var(--confluence-primary, #0052cc);
        }

        /* Dark theme adjustments */
        [data-theme="dark"] #${swaggerContainerId} {
          filter: invert(1) hue-rotate(180deg);
        }

        [data-theme="dark"] #${swaggerContainerId} img,
        [data-theme="dark"] #${swaggerContainerId} .swagger-ui .info .title,
        [data-theme="dark"] #${swaggerContainerId} .swagger-ui .scheme-container {
          filter: invert(1) hue-rotate(180deg);
        }

        /* Loading state */
        .swagger-embed-container .spinner-border {
          color: var(--confluence-primary, #0052cc);
        }

        /* Error state */
        .swagger-embed-container .alert-danger {
          margin: 2rem;
          border-radius: 8px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .swagger-embed-container {
            margin: 0 -1rem;
            border-left: none;
            border-right: none;
            border-radius: 0;
          }
          
          #${swaggerContainerId} .swagger-ui .wrapper {
            padding: 0 1rem;
          }
        }
      `}} />
    </>
  );
};

export default SwaggerEmbed;