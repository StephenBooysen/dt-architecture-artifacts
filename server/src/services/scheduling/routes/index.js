/**
 * Scheduling routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.scheduler - The scheduling provider.
 */
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

module.exports = (options, eventEmitter, scheduler) => {

  if (options['express-app'] && scheduler) {
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

    app.post('/api/scheduling/schedule', (req, res) => {
      const { task, cron } = req.body;
      if (task && cron) {
        scheduler
          .start(task, cron)
          .then(() => res.status(200).send('OK'))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing task or cron expression');
      }
    });

    app.delete('/api/scheduling/cancel/:taskId', (req, res) => {
      const taskId = req.params.taskId;
      scheduler
        .cancel(taskId)
        .then(() => res.status(200).send('OK'))
        .catch((err) => res.status(500).send(err.message));
    });

    app.get('/api/scheduling/status', (req, res) => {
      eventEmitter.emit('api-scheduling-status', 'scheduling api running');
      res.status(200).json('scheduling api running');
    });

    app.get('/api/scheduling/stats', (req, res) => {
      try {
        const stats = scheduler.getScheduleStats ? scheduler.getScheduleStats() : [];
        res.status(200).json(stats);
      } catch (err) {
        res.status(500).send(err.message);
      }
    });

    // Swagger UI routes
    app.get('/api/scheduling/openapi.json', (req, res) => {
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
      customSiteTitle: 'Scheduling Service API Documentation'
    };

    // Create isolated router with own swagger middleware to prevent conflicts
    const express = require('express');
    const docsRouter = express.Router();
    docsRouter.use(swaggerUi.serve);
    docsRouter.get('/', swaggerUi.setup(openApiSpec, swaggerOptions));
    app.use('/api/scheduling/docs', docsRouter);
    app.get('/api/scheduling/docs', (req, res) => {
      const html = swaggerUi.generateHTML(openApiSpec, swaggerOptions);
      res.send(html);
    });
  }
};
