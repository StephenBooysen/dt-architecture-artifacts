/**
 * @fileoverview Singleton measuring service for global access.
 * This ensures only one measuring instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createMeasuring = require('./index');

class MeasuringSingleton extends ServiceSingleton {
  constructor() {
    super('Measuring');
  }

  /**
   * Initialize the measuring singleton with configuration
   * @param {string} type - Measuring type
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Measuring instance
   */
  initialize(type = '', options = {}, eventEmitter = null) {
    return super.initialize(createMeasuring, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the measuring instance
   */
  async measure(name, value, tags = {}) {
    const measuring = this.getInstance();
    if (measuring.measure) {
      return measuring.measure(name, value, tags);
    }
    console.log(`[METRIC] ${name}: ${value}`, tags);
  }

  async counter(name, value = 1, tags = {}) {
    const measuring = this.getInstance();
    if (measuring.counter) {
      return measuring.counter(name, value, tags);
    }
    this.measure(name, value, { ...tags, type: 'counter' });
  }

  async gauge(name, value, tags = {}) {
    const measuring = this.getInstance();
    if (measuring.gauge) {
      return measuring.gauge(name, value, tags);
    }
    this.measure(name, value, { ...tags, type: 'gauge' });
  }

  async timer(name, duration, tags = {}) {
    const measuring = this.getInstance();
    if (measuring.timer) {
      return measuring.timer(name, duration, tags);
    }
    this.measure(name, duration, { ...tags, type: 'timer', unit: 'ms' });
  }

  time(name, tags = {}) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        this.timer(name, duration, tags);
        return duration;
      }
    };
  }
}

// Export a single instance
const measuringInstance = new MeasuringSingleton();

module.exports = measuringInstance;