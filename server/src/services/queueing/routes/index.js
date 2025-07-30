/**
 * Queueing routes for the Express app.
 * @param {object} options - The options object.
 * @param {object} options.express-app - The Express app instance.
 * @param {object} options.queue - The queueing provider.
 */
module.exports = (options, eventEmitter, queue) => {
  if (options['express-app'] && queue) {
    const app = options['express-app'];

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
  }
};
