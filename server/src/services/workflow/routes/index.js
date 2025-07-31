/**
 * Workflow routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.workflow - The workflow provider.
 */
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

module.exports = (options, eventEmitter, workflow) => {

  if (options['express-app'] && workflow) {
    const app = options['express-app'];
    
    // Load OpenAPI specification
    const openApiPath = path.join(__dirname, '../openapi.json');
    let openApiSpec = {};
    try {
      const openApiContent = fs.readFileSync(openApiPath, 'utf8');
      openApiSpec = JSON.parse(openApiContent);
    } catch (error) {
      console.error('Failed to load OpenAPI specification:', error);
    }

    app.post('/api/workflow/defineworkflow', (req, res) => {
      const { name, steps } = req.body;
      if (name) {
        workflow
          .defineWorkflow(name, steps)
          .then((workflowId) => res.status(200).json({ workflowId }))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing workflow name');
      }
    });

    app.post('/api/workflow/start', (req, res) => {
      const { name, data } = req.body;
      if (name) {
        workflow
          .runWorkflow(name, data, (data) => {
            eventEmitter.emit('workflow-complete', data);
          })
          .then((workflowId) => res.status(200).json({ workflowId }))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing workflow name');
      }
    });

    app.get('/api/workflow/status', (req, res) => {
      eventEmitter.emit('api-working-status', 'workflow api running');
      res.status(200).json('workflow api running');
    });

    // Swagger UI routes
    app.get('/api/workflow/openapi.json', (req, res) => {
      res.json(openApiSpec);
    });

    // Swagger UI setup
    const swaggerOptions = {
      explorer: true,
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .scheme-container { display: none; }
      `,
      customSiteTitle: 'Workflow Service API Documentation'
    };

    app.use('/api/workflow/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));
  }
};
