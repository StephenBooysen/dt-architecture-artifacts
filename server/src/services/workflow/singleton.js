/**
 * @fileoverview Singleton workflow service for global access.
 * This ensures only one workflow instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createWorkflow = require('./index');

class WorkflowSingleton extends ServiceSingleton {
  constructor() {
    super('Workflow');
  }

  /**
   * Initialize the workflow singleton with configuration
   * @param {string} type - Workflow type
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Workflow instance
   */
  initialize(type = '', options = {}, eventEmitter = null) {
    return super.initialize(createWorkflow, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the workflow instance
   */
  async execute(workflowName, data, options = {}) {
    const workflow = this.getInstance();
    if (workflow.execute) {
      return workflow.execute(workflowName, data, options);
    }
    console.log(`[WORKFLOW] Execute ${workflowName}:`, data);
  }

  async create(workflowName, definition, options = {}) {
    const workflow = this.getInstance();
    if (workflow.create) {
      return workflow.create(workflowName, definition, options);
    }
    console.log(`[WORKFLOW] Create ${workflowName}:`, definition);
  }

  async update(workflowName, definition, options = {}) {
    const workflow = this.getInstance();
    if (workflow.update) {
      return workflow.update(workflowName, definition, options);
    }
    console.log(`[WORKFLOW] Update ${workflowName}:`, definition);
  }

  async delete(workflowName, options = {}) {
    const workflow = this.getInstance();
    if (workflow.delete) {
      return workflow.delete(workflowName, options);
    }
    console.log(`[WORKFLOW] Delete ${workflowName}`);
  }

  async list(options = {}) {
    const workflow = this.getInstance();
    if (workflow.list) {
      return workflow.list(options);
    }
    return [];
  }

  async get(workflowName, options = {}) {
    const workflow = this.getInstance();
    if (workflow.get) {
      return workflow.get(workflowName, options);
    }
    return null;
  }

  async getStatus(executionId) {
    const workflow = this.getInstance();
    if (workflow.getStatus) {
      return workflow.getStatus(executionId);
    }
    return 'unknown';
  }

  async cancel(executionId) {
    const workflow = this.getInstance();
    if (workflow.cancel) {
      return workflow.cancel(executionId);
    }
    console.log(`[WORKFLOW] Cancel execution: ${executionId}`);
  }

  async retry(executionId, options = {}) {
    const workflow = this.getInstance();
    if (workflow.retry) {
      return workflow.retry(executionId, options);
    }
    console.log(`[WORKFLOW] Retry execution: ${executionId}`);
  }
}

// Export a single instance
const workflowInstance = new WorkflowSingleton();

module.exports = workflowInstance;