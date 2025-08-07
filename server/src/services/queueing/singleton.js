/**
 * @fileoverview Singleton queueing service for global access.
 * This ensures only one queueing instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createQueueing = require('./index');

class QueueingSingleton extends ServiceSingleton {
  constructor() {
    super('Queueing');
  }

  /**
   * Initialize the queueing singleton with configuration
   * @param {string} type - Queueing type
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Queueing instance
   */
  initialize(type = '', options = {}, eventEmitter = null) {
    return super.initialize(createQueueing, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the queueing instance
   */
  async enqueue(queueName, data, options = {}) {
    const queueing = this.getInstance();
    if (queueing.enqueue) {
      return queueing.enqueue(queueName, data, options);
    }
    console.log(`[QUEUE] Enqueue to ${queueName}:`, data);
  }

  async dequeue(queueName, options = {}) {
    const queueing = this.getInstance();
    if (queueing.dequeue) {
      return queueing.dequeue(queueName, options);
    }
    console.log(`[QUEUE] Dequeue from ${queueName}`);
    return null;
  }

  async peek(queueName, options = {}) {
    const queueing = this.getInstance();
    if (queueing.peek) {
      return queueing.peek(queueName, options);
    }
    console.log(`[QUEUE] Peek at ${queueName}`);
    return null;
  }

  async size(queueName) {
    const queueing = this.getInstance();
    if (queueing.size) {
      return queueing.size(queueName);
    }
    console.log(`[QUEUE] Size of ${queueName}`);
    return 0;
  }

  async clear(queueName) {
    const queueing = this.getInstance();
    if (queueing.clear) {
      return queueing.clear(queueName);
    }
    console.log(`[QUEUE] Clear ${queueName}`);
  }

  async listQueues() {
    const queueing = this.getInstance();
    if (queueing.listQueues) {
      return queueing.listQueues();
    }
    return [];
  }
}

// Export a single instance
const queueingInstance = new QueueingSingleton();

module.exports = queueingInstance;