/**
 * @fileoverview Singleton scheduling service for global access.
 * This ensures only one scheduling instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createScheduling = require('./index');

class SchedulingSingleton extends ServiceSingleton {
  constructor() {
    super('Scheduling');
  }

  /**
   * Initialize the scheduling singleton with configuration
   * @param {string} type - Scheduling type
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Scheduling instance
   */
  initialize(type = '', options = {}, eventEmitter = null) {
    return super.initialize(createScheduling, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the scheduling instance
   */
  async schedule(name, schedule, task, options = {}) {
    const scheduling = this.getInstance();
    if (scheduling.schedule) {
      return scheduling.schedule(name, schedule, task, options);
    }
    console.log(`[SCHEDULER] Schedule ${name} with ${schedule}:`, task);
  }

  async unschedule(name) {
    const scheduling = this.getInstance();
    if (scheduling.unschedule) {
      return scheduling.unschedule(name);
    }
    console.log(`[SCHEDULER] Unschedule ${name}`);
  }

  async reschedule(name, newSchedule, options = {}) {
    const scheduling = this.getInstance();
    if (scheduling.reschedule) {
      return scheduling.reschedule(name, newSchedule, options);
    }
    console.log(`[SCHEDULER] Reschedule ${name} to ${newSchedule}`);
  }

  async listScheduled() {
    const scheduling = this.getInstance();
    if (scheduling.listScheduled) {
      return scheduling.listScheduled();
    }
    return [];
  }

  async getSchedule(name) {
    const scheduling = this.getInstance();
    if (scheduling.getSchedule) {
      return scheduling.getSchedule(name);
    }
    return null;
  }

  async executeNow(name) {
    const scheduling = this.getInstance();
    if (scheduling.executeNow) {
      return scheduling.executeNow(name);
    }
    console.log(`[SCHEDULER] Execute ${name} now`);
  }

  async pause(name) {
    const scheduling = this.getInstance();
    if (scheduling.pause) {
      return scheduling.pause(name);
    }
    console.log(`[SCHEDULER] Pause ${name}`);
  }

  async resume(name) {
    const scheduling = this.getInstance();
    if (scheduling.resume) {
      return scheduling.resume(name);
    }
    console.log(`[SCHEDULER] Resume ${name}`);
  }
}

// Export a single instance
const schedulingInstance = new SchedulingSingleton();

module.exports = schedulingInstance;