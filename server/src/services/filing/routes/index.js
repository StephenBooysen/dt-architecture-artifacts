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

    app.get('/api/filing/exists/:key', (req, res) => {
      const key = req.params.key;
      filing
        .exists(key)
        .then((exists) => res.status(200).json({ exists }))
        .catch((err) => res.status(500).send(err.message));
    });

    app.post('/api/filing/mkdir/:path', (req, res) => {
      const dirPath = req.params.path;
      const options = req.body || { recursive: true };
      filing
        .mkdir(dirPath, options)
        .then(() => res.status(200).send('Directory created'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.post('/api/filing/copy', (req, res) => {
      const { sourcePath, destPath } = req.body;
      if (!sourcePath || !destPath) {
        return res.status(400).send('sourcePath and destPath are required');
      }
      filing
        .copy(sourcePath, destPath)
        .then(() => res.status(200).send('File copied'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.post('/api/filing/move', (req, res) => {
      const { sourcePath, destPath } = req.body;
      if (!sourcePath || !destPath) {
        return res.status(400).send('sourcePath and destPath are required');
      }
      filing
        .move(sourcePath, destPath)
        .then(() => res.status(200).send('File moved'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/filing/stat/:key', (req, res) => {
      const key = req.params.key;
      filing
        .stat(key)
        .then((stats) => res.status(200).json(stats))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/filing/list/:path', (req, res) => {
      const dirPath = req.params.path;
      filing
        .list(dirPath)
        .then((files) => res.status(200).json(files))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/filing/listDetailed/:path', (req, res) => {
      const dirPath = req.params.path;
      filing
        .listDetailed(dirPath)
        .then((files) => res.status(200).json(files))
        .catch((err) => res.status(500).send(err.message));
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

    // Create isolated router with own swagger middleware to prevent conflicts
    const express = require('express');
    const docsRouter = express.Router();
    docsRouter.use(swaggerUi.serve);
    docsRouter.get('/', swaggerUi.setup(openApiSpec, swaggerOptions));
    app.use('/api/filing/docs', docsRouter);
    app.get('/api/filing/docs', (req, res) => {
      const html = swaggerUi.generateHTML(openApiSpec, swaggerOptions);
      res.send(html);
    });
  }
};
