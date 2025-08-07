/**
 * @fileoverview Singleton working service for global access.
 * This ensures only one working instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createWorking = require('./index');

class WorkingSingleton extends ServiceSingleton {
  constructor() {
    super('Working');
  }

  /**
   * Initialize the working singleton with configuration
   * @param {string} type - Working type
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Working instance
   */
  initialize(type = '', options = {}, eventEmitter = null) {
    return super.initialize(createWorking, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the working instance
   */
  async work(jobName, data, options = {}) {
    const working = this.getInstance();
    if (working.work) {
      return working.work(jobName, data, options);
    }
    console.log(`[WORKER] Execute job ${jobName}:`, data);
  }

  async addJob(jobName, jobFunction, options = {}) {
    const working = this.getInstance();
    if (working.addJob) {
      return working.addJob(jobName, jobFunction, options);
    }
    console.log(`[WORKER] Add job ${jobName}`);
  }

  async removeJob(jobName) {
    const working = this.getInstance();
    if (working.removeJob) {
      return working.removeJob(jobName);
    }
    console.log(`[WORKER] Remove job ${jobName}`);
  }

  async listJobs() {
    const working = this.getInstance();
    if (working.listJobs) {
      return working.listJobs();
    }
    return [];
  }

  async getJob(jobName) {
    const working = this.getInstance();
    if (working.getJob) {
      return working.getJob(jobName);
    }
    return null;
  }

  async start() {
    const working = this.getInstance();
    if (working.start) {
      return working.start();
    }
    console.log(`[WORKER] Start worker`);
  }

  async stop() {
    const working = this.getInstance();
    if (working.stop) {
      return working.stop();
    }
    console.log(`[WORKER] Stop worker`);
  }

  async pause() {
    const working = this.getInstance();
    if (working.pause) {
      return working.pause();
    }
    console.log(`[WORKER] Pause worker`);
  }

  async resume() {
    const working = this.getInstance();
    if (working.resume) {
      return working.resume();
    }
    console.log(`[WORKER] Resume worker`);
  }

  async getStatus() {
    const working = this.getInstance();
    if (working.getStatus) {
      return working.getStatus();
    }
    return 'unknown';
  }
}

// Export a single instance
const workingInstance = new WorkingSingleton();

module.exports = workingInstance;