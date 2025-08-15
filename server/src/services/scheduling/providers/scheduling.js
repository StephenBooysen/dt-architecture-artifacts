/**
 * @fileoverview Provides a singleton scheduler for executing tasks at intervals.
 */

const getWorkerInstance = require('../../working/');

/**
 * Manages scheduling and execution of tasks in a worker thread.
 */
class SchedulerProvider {
  /**
   * Initializes the SchedulerProvider.
   */
  constructor(options, eventEmitter) {
    this.eventEmitter_ = eventEmitter;
    /** @private {Map<string, object>} */
    this.tasks_ = new Map();
    /** @private {WorkerProvider} */
    this.worker_ = getWorkerInstance('memory', options, this.eventEmitter_);
    
    /** @private @const {!Map<string, Object>} */
    this.scheduleStats_ = new Map();
  }

  /**
   * Starts the scheduler to execute a script at a given interval or cron expression.
   * @param {string} taskName The name of the task to schedule.
   * @param {string|number} scheduleOrInterval Either a cron expression string or interval in seconds.
   * @param {string=} scriptPath The absolute path to the Node.js file to execute (optional for cron mode).
   * @param {Function=} executionCallback Optional callback function to be called on each execution.
   */
  async start(taskName, scheduleOrInterval, scriptPath, executionCallback) {
    if (this.tasks_.has(taskName)) {
      if (this.eventEmitter_)
        this.eventEmitter_.emit('scheduler:start:error', {
          taskName,
          error: 'Task already scheduled.',
        });
      return;
    }

    // Initialize schedule statistics
    this._initializeScheduleStats(taskName, scheduleOrInterval);

    const executeTask = () => {
      this._updateScheduleStats(taskName, 'execute');
      
      if (scriptPath) {
        this.worker_.start(scriptPath, null, (status, data) => {
          if (executionCallback) {
            executionCallback(status, data);
          }
          if (this.eventEmitter_)
            this.eventEmitter_.emit('scheduler:taskExecuted', {
              taskName,
              scriptPath,
              status,
              data,
            });
        });
      } else {
        // For cron mode without script path, just track execution
        if (executionCallback) {
          executionCallback('completed', { taskName, executedAt: new Date().toISOString() });
        }
        if (this.eventEmitter_)
          this.eventEmitter_.emit('scheduler:taskExecuted', {
            taskName,
            status: 'completed',
            data: { executedAt: new Date().toISOString() },
          });
      }
    };

    let intervalId;
    
    // Handle both cron expressions and interval seconds
    if (typeof scheduleOrInterval === 'string') {
      // Cron expression mode - for now, execute every minute for demo
      // In production, you'd use a proper cron parser like node-cron
      intervalId = setInterval(executeTask, 60 * 1000); // Every minute for demo
    } else {
      // Interval mode (legacy support)
      executeTask(); // Execute immediately
      intervalId = setInterval(executeTask, scheduleOrInterval * 1000);
    }
    
    this.tasks_.set(taskName, {
      intervalId,
      scriptPath,
      executionCallback,
      schedule: scheduleOrInterval,
    });

    if (this.eventEmitter_)
      this.eventEmitter_.emit('scheduler:started', {
        taskName,
        scriptPath: scriptPath || 'cron-task',
        schedule: scheduleOrInterval,
      });
  }

  /**
   * Stops a specific task or all tasks if no task name is provided.
   * @param {string=} taskName The name of the task to stop.
   */
  async stop(taskName) {
    if (taskName) {
      if (this.tasks_.has(taskName)) {
        const task = this.tasks_.get(taskName);
        clearInterval(task.intervalId);
        this.tasks_.delete(taskName);
        // Don't remove stats when stopping - keep historical data
        if (this.eventEmitter_)
          this.eventEmitter_.emit('scheduler:stopped', { taskName });
      }
    } else {
      this.tasks_.forEach((task, name) => {
        clearInterval(task.intervalId);
        if (this.eventEmitter_)
          this.eventEmitter_.emit('scheduler:stopped', { taskName: name });
      });
      this.tasks_.clear();
      // Don't clear stats when stopping all - keep historical data
    }
    if (this.tasks_.size === 0) {
      this.worker_.stop();
    }
  }

  /**
   * Alias for stop method to match the API routes expectation.
   * @param {string} taskName The name of the task to cancel.
   */
  async cancel(taskName) {
    return this.stop(taskName);
  }

  /**
   * Checks if a specific task or any task is running.
   * @param {string=} taskName The name of the task to check.
   * @return {boolean} True if the task(s) are running, false otherwise.
   */
  async isRunning(taskName) {
    if (taskName) {
      return this.tasks_.has(taskName);
    }
    return this.tasks_.size > 0;
  }

  /**
   * Initializes statistics for a schedule.
   * @param {string} scheduleName The schedule name.
   * @param {string|number} schedule The schedule expression or interval.
   * @private
   */
  _initializeScheduleStats(scheduleName, schedule) {
    const now = Date.now();
    const stats = {
      schedulename: scheduleName,
      "no of executions": 0,
      "last run": null,
      "next run": this._calculateNextRun(schedule, now),
      schedule: schedule,
      created: now
    };
    this.scheduleStats_.set(scheduleName, stats);
    
    // Keep only top 100 entries by removing least recently run
    if (this.scheduleStats_.size > 100) {
      let oldestSchedule = null;
      let oldestTime = Infinity;
      
      for (const [k, v] of this.scheduleStats_) {
        const lastActivity = v["last run"] || v.created;
        if (lastActivity < oldestTime) {
          oldestTime = lastActivity;
          oldestSchedule = k;
        }
      }
      
      if (oldestSchedule) {
        this.scheduleStats_.delete(oldestSchedule);
      }
    }
  }

  /**
   * Updates statistics for a schedule execution.
   * @param {string} scheduleName The schedule name.
   * @param {string} operation The operation type ('execute').
   * @private
   */
  _updateScheduleStats(scheduleName, operation) {
    const stats = this.scheduleStats_.get(scheduleName);
    if (!stats) return;
    
    const now = Date.now();
    
    if (operation === 'execute') {
      stats["no of executions"]++;
      stats["last run"] = this._formatTimestamp(now);
      stats["next run"] = this._calculateNextRun(stats.schedule, now);
    }
  }

  /**
   * Calculates the next run time for a schedule.
   * @param {string|number} schedule The schedule expression or interval.
   * @param {number} fromTime The base time to calculate from.
   * @return {string} Formatted next run time.
   * @private
   */
  _calculateNextRun(schedule, fromTime) {
    let nextRunTime;
    
    if (typeof schedule === 'string') {
      // For cron expressions, calculate next minute for demo
      nextRunTime = new Date(fromTime + 60 * 1000);
    } else {
      // For intervals, add the interval seconds
      nextRunTime = new Date(fromTime + schedule * 1000);
    }
    
    return this._formatTimestamp(nextRunTime.getTime());
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
      hour12: false
    });
  }

  /**
   * Gets the schedule statistics ordered by latest run date.
   * @return {Array<Object>} Array of schedule statistics.
   */
  getScheduleStats() {
    const stats = Array.from(this.scheduleStats_.values());
    return stats.sort((a, b) => {
      const aLastRun = a["last run"] ? new Date(a["last run"]).getTime() : a.created;
      const bLastRun = b["last run"] ? new Date(b["last run"]).getTime() : b.created;
      return bLastRun - aLastRun;
    });
  }
}

module.exports = SchedulerProvider;
