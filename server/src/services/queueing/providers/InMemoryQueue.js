/**
 * @fileoverview An in-memory queue implementation.
 */

/**
 * A class that implements an in-memory queue.
 */
class InMemoryQueue {
  /**
   * Initializes the in-memory queue.
   */
  constructor(options, eventEmitter) {
    this.queues = {};
    this.eventEmitter_ = eventEmitter;
    
    /** @private @const {!Map<string, Object>} */
    this.queueStats_ = new Map();
  }

  /**
   * Adds an item to the end of the queue.
   * @param {*} queueName The name of the queue.
   * @param {*} item The item to add to the queue.
   */
  async enqueue(queueName, item) {
    if (this.queues[queueName] == null){
      this.queues[queueName] = [];
    }
    var queue = this.queues[queueName];
    queue.push(item);
    this._updateQueueStats(queueName, 'enqueue');
    if (this.eventEmitter_) this.eventEmitter_.emit('queue:enqueue', { item });
  }

  /**
   * Removes and returns the item at the front of the queue.
   * @param {*} queueName The name of the queue.
   * @return {*} The item at the front of the queue, or undefined if the queue is empty.
   */
  async dequeue(queueName) {
    if (this.queues[queueName] == null){
      this.queues[queueName] = [];
    }
    var queue = this.queues[queueName];
    const item = queue.shift();
    if (item) {
      this._updateQueueStats(queueName, 'dequeue');
    }
    if (item && this.eventEmitter_)
      this.eventEmitter_.emit('queue:dequeue', { item });
    return item;
  }

  /**
   * Returns the number of items in the queue.
   * @return {number} The number of items in the queue.
   */
  async size(queueName) {
    if (this.queues[queueName] == null){
      this.queues[queueName] = [];
    }
    var queue = this.queues[queueName];
    return queue.length;
  }

  /**
   * Updates statistics for a queue operation.
   * @param {string} queueName The queue name.
   * @param {string} operation The operation type ('enqueue' or 'dequeue').
   * @private
   */
  _updateQueueStats(queueName, operation) {
    const now = Date.now();
    let stats = this.queueStats_.get(queueName);
    
    if (!stats) {
      stats = {
        queuename: queueName,
        messages: 0,
        lastEnqueued: null,
        created: now,
        totalEnqueued: 0,
        totalDequeued: 0
      };
      this.queueStats_.set(queueName, stats);
    }
    
    if (operation === 'enqueue') {
      stats.lastEnqueued = now;
      stats.totalEnqueued++;
    } else if (operation === 'dequeue') {
      stats.totalDequeued++;
    }
    
    // Update current message count
    const currentQueue = this.queues[queueName];
    stats.messages = currentQueue ? currentQueue.length : 0;
    
    // Keep only top 100 entries by removing least recently enqueued
    if (this.queueStats_.size > 100) {
      let oldestQueue = null;
      let oldestTime = Infinity;
      
      for (const [k, v] of this.queueStats_) {
        const lastActivity = v.lastEnqueued || v.created;
        if (lastActivity < oldestTime) {
          oldestTime = lastActivity;
          oldestQueue = k;
        }
      }
      
      if (oldestQueue) {
        this.queueStats_.delete(oldestQueue);
      }
    }
  }

  /**
   * Gets the top queue statistics ordered by latest enqueued message.
   * @return {Array<Object>} Array of queue statistics.
   */
  getQueueStats() {
    const stats = Array.from(this.queueStats_.values());
    // Update current message counts before returning
    stats.forEach(stat => {
      const currentQueue = this.queues[stat.queuename];
      stat.messages = currentQueue ? currentQueue.length : 0;
    });
    return stats.sort((a, b) => {
      const aLastEnqueued = a.lastEnqueued || a.created;
      const bLastEnqueued = b.lastEnqueued || b.created;
      return bLastEnqueued - aLastEnqueued;
    });
  }
}

module.exports = InMemoryQueue;
