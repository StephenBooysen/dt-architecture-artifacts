/**
 * Notifying routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.notifier - The notifying provider.
 */
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

module.exports = (options, eventEmitter, notifier) => {

  if (options['express-app'] && notifier) {
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

    app.post('/api/notifying/topic', (req, res) => {
      const { topic } = req.body;
      if (topic) {
        notifier
          .createTopic(topic)
          .then(() => res.status(200).send('OK'))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing topic');
      }
    });

    app.post('/api/notifying/subscribe/topic/:topic', (req, res) => {
      const topic = req.params.topic;
      const { callbackUrl } = req.body;
      if (topic && callbackUrl) {
        notifier
          .subscribe(topic, callbackUrl)
          .then(() => res.status(200).send('OK'))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing topic or callback URL');
      }
    });

    app.post('/api/notifying/unsubscribe/topic/:topic', (req, res) => {
      const topic = req.params.topic;
      const { callbackUrl } = req.body;
      if (topic && callbackUrl) {
        notifier
          .unsubscribe(topic, callbackUrl)
          .then(() => res.status(200).send('OK'))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing topic or callback URL');
      }
    });

    app.post('/api/notifying/notify/topic/:topic', (req, res) => {
      const topic = req.params.topic;
      const { message } = req.body;
      if (topic && message) {
        notifier
          .notify(topic, message)
          .then(() => res.status(200).send('OK'))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing recipient or message');
      }
    });

    app.get('/api/notifying/status', (req, res) => {
      eventEmitter.emit('api-notifying-status', 'notifying api running');
      res.status(200).json('notifying api running');
    });

    // Swagger UI routes
    app.get('/api/notifying/openapi.json', (req, res) => {
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
      customSiteTitle: 'Notifying Service API Documentation'
    };

    app.use('/api/notifying/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));
  }
};
