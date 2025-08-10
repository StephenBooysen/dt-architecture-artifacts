/**
 * @fileoverview Factory for the Search service.
 * 
 * This module provides a factory function for creating SearchService instances
 * with integrated routing capabilities. It initializes the search provider and
 * sets up API routes for search functionality.
 * 
 * Methods:
 * - createSearchService(type, options, eventEmitter): Creates search service instance
 */
'use strict';
const SearchService = require('./provider/searching.js');
const Routes = require('./routes');

/**
 * Creates a SearchService instance with routing capabilities.
 * 
 * This factory function instantiates a SearchService with the specified configuration,
 * initializes API routes for search operations, and emits lifecycle events for
 * service tracking. The search service provides text-based search functionality
 * with Map-based storage.
 * 
 * @param {string} type - The type of search service to create (currently unused)
 * @param {Object} options - Configuration options for the search service
 * @param {EventEmitter} eventEmitter - Event emitter for service communication
 * @returns {SearchService} Configured search service instance
 * @emits {string} 'Search Service Intantiated' - When search service is created
 */
function createSearchService(type, options, eventEmitter) {
  eventEmitter.emit('Search Service Intantiated', {});
  const searching = new SearchService(options, eventEmitter);
  Routes(options, eventEmitter, searching);
  return searching;
}

module.exports = createSearchService;
