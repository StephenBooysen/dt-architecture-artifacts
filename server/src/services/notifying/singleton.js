/**
 * @fileoverview Singleton notifying service for global access.
 * This ensures only one notifying instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createNotifying = require('./index');

class NotifyingSingleton extends ServiceSingleton {
  constructor() {
    super('Notifying');
  }

  /**
   * Initialize the notifying singleton with configuration
   * @param {string} type - Notifying type
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Notifying instance
   */
  initialize(type = '', options = {}, eventEmitter = null) {
    return super.initialize(createNotifying, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the notifying instance
   */
  async notify(message, options = {}) {
    const notifying = this.getInstance();
    if (notifying.notify) {
      return notifying.notify(message, options);
    }
    console.log(`[NOTIFICATION] ${message}`, options);
  }

  async email(to, subject, body, options = {}) {
    const notifying = this.getInstance();
    if (notifying.email) {
      return notifying.email(to, subject, body, options);
    }
    this.notify(`Email to ${to}: ${subject}`, { body, ...options });
  }

  async sms(to, message, options = {}) {
    const notifying = this.getInstance();
    if (notifying.sms) {
      return notifying.sms(to, message, options);
    }
    this.notify(`SMS to ${to}: ${message}`, options);
  }

  async push(title, body, options = {}) {
    const notifying = this.getInstance();
    if (notifying.push) {
      return notifying.push(title, body, options);
    }
    this.notify(`Push: ${title}`, { body, ...options });
  }

  async webhook(url, data, options = {}) {
    const notifying = this.getInstance();
    if (notifying.webhook) {
      return notifying.webhook(url, data, options);
    }
    this.notify(`Webhook to ${url}`, { data, ...options });
  }
}

// Export a single instance
const notifyingInstance = new NotifyingSingleton();

module.exports = notifyingInstance;