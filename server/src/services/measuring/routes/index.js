/**
 * Measuring routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.measuring - The measuring provider.
 */
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

module.exports = (options, eventEmitter, measuring) => {

  if (options['express-app'] && measuring) {
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

    app.post('/api/measuring/add', (req, res) => {
      const { metric, value } = req.body;
      if (metric && value) {
        measuring
          .add(metric, value)
          .then(() => res.status(200).send('OK'))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing metric or value');
      }
    });
        
    app.get('/api/measuring/list/:metric/:datestart/:dateend', (req, res) => {
      measuring
        .list(req.params.metric, new Date(req.params.datestart), new Date(req.params.dateend))
        .then((value) => res.status(200).json(value))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/measuring/total/:metric/:datestart/:dateend', (req, res) => {
      measuring
        .total(req.params.metric, new Date(req.params.datestart), new Date(req.params.dateend))
        .then((value) => res.status(200).json(value))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/measuring/average/:metric/:datestart/:dateend', (req, res) => {
      measuring
        .average(req.params.metric, new Date(req.params.datestart), new Date(req.params.dateend))
        .then((value) => res.status(200).json(value))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/measuring/status', (req, res) => {
      eventEmitter.emit('api-measuring-status', 'measuring api running');
      res.status(200).json('measuring api running');
    });

    // Swagger UI routes
    app.get('/api/measuring/openapi.json', (req, res) => {
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
      customSiteTitle: 'Measuring Service API Documentation'
    };

    // Create isolated router with own swagger middleware to prevent conflicts
    const express = require('express');
    const docsRouter = express.Router();
    docsRouter.use(swaggerUi.serve);
    docsRouter.get('/', swaggerUi.setup(openApiSpec, swaggerOptions));
    app.use('/api/measuring/docs', docsRouter);
    app.get('/api/measuring/docs', (req, res) => {
      const html = swaggerUi.generateHTML(openApiSpec, swaggerOptions);
      res.send(html);
    });
  }
};
