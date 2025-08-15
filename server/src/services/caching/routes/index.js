/**
 * Caching routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.cache - The caching provider.
 */
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

module.exports = (options, eventEmitter, cache) => {

  if (options['express-app'] && cache) {
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

    app.post('/api/caching/put/:key', (req, res) => {
      const key = req.params.key;
      const value = req.body;
      cache
        .put(key, value)
        .then(() => res.status(200).send('OK'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/caching/get/:key', (req, res) => {
      const key = req.params.key;
      cache
        .get(key)
        .then((value) => res.status(200).json(value))
        .catch((err) => res.status(500).send(err.message));
    });

    app.delete('/api/caching/delete/:key', (req, res) => {
      const key = req.params.key;
      cache
        .delete(key)
        .then(() => res.status(200).send('OK'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/caching/status', (req, res) => {
      eventEmitter.emit('api-cache-status', 'caching api running');
      res.status(200).json('caching api running');
    });

    app.get('/api/caching/stats', (req, res) => {
      try {
        const stats = cache.getKeyStats ? cache.getKeyStats() : [];
        res.status(200).json(stats);
      } catch (err) {
        res.status(500).send(err.message);
      }
    });

    // Swagger UI routes
    app.get('/api/caching/openapi.json', (req, res) => {
      res.json(openApiSpec);
    });

    // Swagger UI setup with service-specific instance
    const swaggerOptions = {
      explorer: true,
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .scheme-container { display: none; }
      `,
      customSiteTitle: 'Caching Service API Documentation'
    };

    // Create isolated router with own swagger middleware to prevent conflicts
    const express = require('express');
    const docsRouter = express.Router();
    docsRouter.use(swaggerUi.serve);
    docsRouter.get('/', swaggerUi.setup(openApiSpec, swaggerOptions));
    app.use('/api/caching/docs', docsRouter);
  }
};
