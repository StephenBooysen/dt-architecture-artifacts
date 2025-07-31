/**
 * Queueing routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.queue - The queueing provider.
 */
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

module.exports = (options, eventEmitter, queue) => {
  if (options['express-app'] && queue) {
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

    app.post('/api/queueing/enqueue/:queueName', (req, res) => {
      const queueName = req.params.queueName;
      const value = req.body;
      if (queueName && value ) {
        queue
          .enqueue(queueName,value)
          .then(() => res.status(200).send('OK'))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing queue name or value');
      }
    });

    app.get('/api/queueing/dequeue/:queueName', (req, res) => {
      const queueName = req.params.queueName;
      queue
        .dequeue(queueName)
        .then((task) => res.status(200).json(task))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/queueing/size/:queueName', (req, res) => {
      const queueName = req.params.queueName;
      queue
        .size(queueName)
        .then((size) => res.status(200).json(size))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/queueing/status', (req, res) => {
      eventEmitter.emit('api-queueing-status', 'queueing api running');
      res.status(200).json('queueing api running');
    });

    // Swagger UI routes
    app.get('/api/queueing/openapi.json', (req, res) => {
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
      customSiteTitle: 'Queueing Service API Documentation'
    };

    // Create isolated router with own swagger middleware to prevent conflicts
    const express = require('express');
    const docsRouter = express.Router();
    docsRouter.use(swaggerUi.serve);
    docsRouter.get('/', swaggerUi.setup(openApiSpec, swaggerOptions));
    app.use('/api/queueing/docs', docsRouter);
    app.get('/api/queueing/docs', (req, res) => {
      const html = swaggerUi.generateHTML(openApiSpec, swaggerOptions);
      res.send(html);
    });
  }
};
