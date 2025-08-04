/**
 * @fileoverview Babel configuration for React and Node.js transpilation
 * 
 * Configures Babel presets and plugins for:
 * - ES6+ transpilation with @babel/preset-env
 * - React JSX transformation with automatic runtime
 * - Class properties support
 * - Runtime transformation for optimized builds
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }],
    ['@babel/preset-react', {
      runtime: 'automatic' // Use the new JSX transform
    }]
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-transform-runtime'
  ]
};