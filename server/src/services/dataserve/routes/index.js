/**
 * Dataserve routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.dataserve - The dataserve provider.
 */
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

module.exports = (options, eventEmitter, dataserve) => {

  if (options['express-app'] && dataserve) {
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

    app.post('/api/dataserve/put/:key', (req, res) => {
      const key = req.params.key;
      const value = req.body;
      dataserve
        .put(key, value)
        .then(() => res.status(200).send('OK'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/dataserve/get/:key', (req, res) => {
      const key = req.params.key;
      dataserve
        .get(key)
        .then((value) => res.status(200).json(value))
        .catch((err) => res.status(500).send(err.message));
    });

    app.delete('/api/dataserve/delete/:key', (req, res) => {
      const key = req.params.key;
      dataserve
        .delete(key)
        .then(() => res.status(200).send('OK'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/dataserve/status', (req, res) => {
      eventEmitter.emit('api-dataserve-status', 'dataserve api running');
      res.status(200).json('running');
    });

    // Swagger UI routes
    app.get('/api/dataserve/openapi.json', (req, res) => {
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
      customSiteTitle: 'Dataserve Service API Documentation'
    };

    // Create isolated router with own swagger middleware to prevent conflicts
    const express = require('express');
    const docsRouter = express.Router();
    docsRouter.use(swaggerUi.serve);
    docsRouter.get('/', swaggerUi.setup(openApiSpec, swaggerOptions));
    app.use('/api/dataserve/docs', docsRouter);
  }
};
