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
}

module.exports = InMemoryQueue;
