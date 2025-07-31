/**
 * Filing routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.filing - The filing provider.
 */
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

module.exports = (options, eventEmitter, filing) => {

  if (options['express-app'] && filing) {
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

    app.post('/api/filing/upload/:key', (req, res) => {
      const key = req.params.key;
      const value = req.body;
      filing
        .upload(key, value)
        .then(() => res.status(200).send('OK'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/filing/download/:key', (req, res) => {
      const key = req.params.key;
      filing
        .download(key)
        .then((value) => res.status(200).json(value))
        .catch((err) => res.status(500).send(err.message));
    });

    app.delete('/api/filing/remove/:key', (req, res) => {
      const key = req.params.key;
      filing
        .remove(key)
        .then(() => res.status(200).send('OK'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/filing/status', (req, res) => {
      eventEmitter.emit('api-filing-status', 'filing api running');
      res.status(200).json('filing api running');
    });

    // Swagger UI routes
    app.get('/api/filing/openapi.json', (req, res) => {
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
      customSiteTitle: 'Filing Service API Documentation'
    };

    app.use('/api/filing/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));
  }
};
