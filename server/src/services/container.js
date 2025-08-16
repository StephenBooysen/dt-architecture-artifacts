/**
 * @fileoverview Compatibility layer for the old simple DI container.
 * Redirects calls to the new enhanced DI container.
 * 
 * @deprecated Use ServiceContainer directly instead
 */

const container = require('./ServiceContainer');

console.warn('⚠️ DEPRECATED: services/container.js is deprecated. Use ServiceContainer directly.');

// Re-export the enhanced container for backward compatibility
module.exports = container;