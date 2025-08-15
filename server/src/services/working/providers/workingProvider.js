/**
 * @fileoverview Provides a singleton worker thread for executing tasks.
 */

const { Worker } = require('worker_threads');
const path = require('path');

/**
 * Manages a single worker thread for executing tasks.
 */
class WorkerProvider {
  /**
   * Initializes the WorkerProvider.
   */
  constructor(options, eventEmitter) {
    /** @private {Worker} */
    this.worker_ = null;
    /** @private {string} */
    this.status_ = 'idle';
    /** @private {Function} */
    this.completionCallback_ = null;
    this.eventEmitter_ = eventEmitter;
    
    /** @private @const {!Map<string, Object>} */
    this.workerStats_ = new Map();
    /** @private {string} */
    this.currentWorkerName_ = null;
    /** @private {number} */
    this.currentStartTime_ = null;
  }

  /**
   * Starts the worker thread and executes the provided script.
   * @param {string} scriptPath The absolute path to the script to execute in the worker.
   * @param {Object} data The data to be passed to the worker thread.
   * @param {Function=} completionCallback Optional callback function to be called on completion.
   */
  async start(scriptPath, data,  completionCallback) {
    
    if (this.worker_) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('worker:start:error', {
          scriptPath,
          error: 'Worker already running.',
        });
      return;
    }
    this.completionCallback_ = completionCallback;
    
    // Track worker execution start
    this.currentWorkerName_ = this._extractWorkerName(scriptPath);
    this.currentStartTime_ = Date.now();
    this._updateWorkerStats(this.currentWorkerName_, 'start');

    this.worker_ = new Worker(
      path.resolve(__dirname, './workerScript.js')
    );

    if (this.eventEmitter_)
      this.eventEmitter_.emit('worker:start', { scriptPath , data });

    this.worker_.on('message', (message) => {
      if (message.type === 'status') {
        this.status_ = message.status;
        if (this.eventEmitter_)
          this.eventEmitter_.emit('worker:status', {
            status: this.status_,
            data: message.data,
          });
        if (this.status_ === 'completed' || this.status_ === 'error') {
          // Track worker execution end
          if (this.currentWorkerName_) {
            this._updateWorkerStats(this.currentWorkerName_, 'end');
          }
          if (this.completionCallback_) {
            this.completionCallback_(this.status_, message.data);
          }
          this.stop(); // Automatically stop worker after completion or error
        }
      } else if (message.type === 'currentStatus') {
        // This is a response to a getStatus call, not handled here directly
      }
    });

    this.worker_.on('error', (err) => {
      this.status_ = 'error';
      console.error('Worker error:', err);
      // Track worker execution end on error
      if (this.currentWorkerName_) {
        this._updateWorkerStats(this.currentWorkerName_, 'end');
      }
      if (this.eventEmitter_)
        this.eventEmitter_.emit('worker:error', { error: err.message });
      if (this.completionCallback_) {
        this.completionCallback_(this.status_, err.message);
      }
      this.stop();
    });

    this.worker_.on('exit', (code) => {
      if (code !== 0 && this.status_ !== 'error') {
        this.status_ = 'error';
        console.error(`Worker stopped with exit code ${code}`);
        // Track worker execution end on error exit
        if (this.currentWorkerName_) {
          this._updateWorkerStats(this.currentWorkerName_, 'end');
        }
        if (this.eventEmitter_)
          this.eventEmitter_.emit('worker:exit:error', { code });
        if (this.completionCallback_) {
          this.completionCallback_(
            this.status_,
            `Worker exited with code ${code}`,
          );
        }
      }
      if (this.eventEmitter_) this.eventEmitter_.emit('worker:exit', { code });
      this.worker_ = null;
      // Reset tracking variables
      this.currentWorkerName_ = null;
      this.currentStartTime_ = null;
    });

    this.worker_.postMessage({ type: 'start', scriptPath: scriptPath });
  }

  /**
   * Stops the worker thread.
   */
  async stop() {
    if (this.worker_) {
      this.worker_.terminate();
      this.worker_ = null;
      this.status_ = 'idle';
      // Reset tracking variables
      this.currentWorkerName_ = null;
      this.currentStartTime_ = null;
      if (this.eventEmitter_) this.eventEmitter_.emit('worker:stop');
    }
  }

  /**
   * Gets the current status of the worker.
   * @return {string} The current status of the worker.
   */
  async getStatus() {
    return this.status_;
  }

  /**
   * Extracts a worker name from the script path.
   * @param {string} scriptPath The script path.
   * @return {string} The worker name.
   * @private
   */
  _extractWorkerName(scriptPath) {
    if (!scriptPath) return 'anonymous-worker';
    // Extract filename without extension
    const filename = path.basename(scriptPath, path.extname(scriptPath));
    return filename || 'unknown-worker';
  }

  /**
   * Updates statistics for a worker execution.
   * @param {string} workerName The worker name.
   * @param {string} operation The operation type ('start' or 'end').
   * @private
   */
  _updateWorkerStats(workerName, operation) {
    const now = Date.now();
    let stats = this.workerStats_.get(workerName);
    
    if (!stats) {
      stats = {
        workername: workerName,
        "start run": null,
        "end run": null,
        executions: 0,
        lastRun: null,
        created: now
      };
      this.workerStats_.set(workerName, stats);
    }
    
    if (operation === 'start') {
      stats["start run"] = this._formatTimestamp(this.currentStartTime_);
      stats.executions++;
    } else if (operation === 'end') {
      stats["end run"] = this._formatTimestamp(now);
      stats.lastRun = now;
    }
    
    // Keep only top 100 entries by removing least recently run
    if (this.workerStats_.size > 100) {
      let oldestWorker = null;
      let oldestTime = Infinity;
      
      for (const [k, v] of this.workerStats_) {
        const lastActivity = v.lastRun || v.created;
        if (lastActivity < oldestTime) {
          oldestTime = lastActivity;
          oldestWorker = k;
        }
      }
      
      if (oldestWorker) {
        this.workerStats_.delete(oldestWorker);
      }
    }
  }

  /**
   * Formats a timestamp for display.
   * @param {number} timestamp The timestamp to format.
   * @return {string} Formatted timestamp.
   * @private
   */
  _formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Gets the worker statistics ordered by latest run date.
   * @return {Array<Object>} Array of worker statistics.
   */
  getWorkerStats() {
    const stats = Array.from(this.workerStats_.values());
    return stats.sort((a, b) => {
      const aLastRun = a.lastRun || a.created;
      const bLastRun = b.lastRun || b.created;
      return bLastRun - aLastRun;
    });
  }
}

module.exports = WorkerProvider;
