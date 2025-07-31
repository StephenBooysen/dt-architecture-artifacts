/**
 * Logging routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.logger - The logging provider.
 */
module.exports = (options, eventEmitter, logger) => {

  if (options['express-app'] && logger) {
    const app = options['express-app'];

    app.post('/api/logging/log/:logname', (req, res) => {
      const logname = req.params.logname;
      const message = req.body;
      if (logname && message) {
        logger
          .log(logname,message)
          .then(() => res.status(200).send('OK'))
          .catch((err) => res.status(500).send(err.message));
      } else {
        res.status(400).send('Bad Request: Missing message');
      }
    });

    app.get('/api/logging/status', (req, res) => {
      eventEmitter.emit('api-logging-status', 'logging api running');
      res.status(200).json('logging api running');
    });
  }
};
