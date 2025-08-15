/**
 * Working routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.worker - The working provider.
 */
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

module.exports = (options, eventEmitter, worker) => {

  if (options['express-app'] && worker) {
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

    app.post('/api/working/run', (req, res) => {
      const { task, data } = req.body;
      if (task) {
        worker
          .start(task, (data) => {
            eventEmitter.emit('worker-complete', data);
          })
          .then((result) => res.status(200).json(result))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing task');
      }
    });

    app.get('/api/working/stop', (req, res) => {
      worker
        .stop()
        .then((result) => res.status(200).json(result))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/working/status', (req, res) => {
      eventEmitter.emit('api-working-status', 'working api running');
      res.status(200).json('working api running');
    });

    app.get('/api/working/stats', (req, res) => {
      try {
        const stats = worker.getWorkerStats ? worker.getWorkerStats() : [];
        res.status(200).json(stats);
      } catch (err) {
        res.status(500).send(err.message);
      }
    });

    // Swagger UI routes
    app.get('/api/working/openapi.json', (req, res) => {
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
      customSiteTitle: 'Working Service API Documentation'
    };

    // Create isolated router with own swagger middleware to prevent conflicts
    const express = require('express');
    const docsRouter = express.Router();
    docsRouter.use(swaggerUi.serve);
    docsRouter.get('/', swaggerUi.setup(openApiSpec, swaggerOptions));
    app.use('/api/working/docs', docsRouter);
    app.get('/api/working/docs', (req, res) => {
      const html = swaggerUi.generateHTML(openApiSpec, swaggerOptions);
      res.send(html);
    });
  }
};
