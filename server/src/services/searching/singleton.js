/**
 * @fileoverview Singleton searching service for global access.
 * This ensures only one searching instance exists throughout the application.
 */

const ServiceSingleton = require('../base/ServiceSingleton');
const createSearching = require('./index');

class SearchingSingleton extends ServiceSingleton {
  constructor() {
    super('Searching');
  }

  /**
   * Initialize the searching singleton with configuration
   * @param {string} type - Searching type
   * @param {Object} options - Configuration options
   * @param {EventEmitter} eventEmitter - Event emitter instance
   * @returns {*} Searching instance
   */
  initialize(type = '', options = {}, eventEmitter = null) {
    return super.initialize(createSearching, type, options, eventEmitter);
  }

  /**
   * Convenience methods that delegate to the searching instance
   */
  async search(query, options = {}) {
    const searching = this.getInstance();
    if (searching.search) {
      return searching.search(query, options);
    }
    console.log(`[SEARCH] Query: "${query}"`, options);
    return [];
  }

  async index(document, options = {}) {
    const searching = this.getInstance();
    if (searching.index) {
      return searching.index(document, options);
    }
    console.log(`[SEARCH] Index document:`, document);
  }

  async add(key, document, options = {}) {
    const searching = this.getInstance();
    if (searching.add) {
      return searching.add(key, document, options);
    }
    console.log(`[SEARCH] Add document with key: ${key}`, document);
    return false;
  }

  async remove(documentId, options = {}) {
    const searching = this.getInstance();
    if (searching.remove) {
      return searching.remove(documentId, options);
    }
    console.log(`[SEARCH] Remove document: ${documentId}`);
  }

  async update(documentId, document, options = {}) {
    const searching = this.getInstance();
    if (searching.update) {
      return searching.update(documentId, document, options);
    }
    console.log(`[SEARCH] Update document: ${documentId}`, document);
  }

  async suggest(query, options = {}) {
    const searching = this.getInstance();
    if (searching.suggest) {
      return searching.suggest(query, options);
    }
    console.log(`[SEARCH] Suggest for: "${query}"`);
    return [];
  }

  async autocomplete(prefix, options = {}) {
    const searching = this.getInstance();
    if (searching.autocomplete) {
      return searching.autocomplete(prefix, options);
    }
    console.log(`[SEARCH] Autocomplete for: "${prefix}"`);
    return [];
  }

  async clearIndex(options = {}) {
    const searching = this.getInstance();
    if (searching.clearIndex) {
      return searching.clearIndex(options);
    }
    console.log(`[SEARCH] Clear index`);
  }

  async getStats() {
    const searching = this.getInstance();
    if (searching.getStats) {
      return searching.getStats();
    }
    return { documents: 0, indices: 0 };
  }
}

// Export a single instance
const searchingInstance = new SearchingSingleton();

module.exports = searchingInstance;