/**
 * @fileoverview Spaces configuration module
 * Provides access to space configurations
 */

const fs = require('fs');
const path = require('path');

const SPACES_CONFIG_PATH = path.join(__dirname, '../../../server-data/spaces.json');

/**
 * Load spaces configuration from JSON file
 */
function loadSpacesConfig() {
  try {
    const configData = fs.readFileSync(SPACES_CONFIG_PATH, 'utf8');
    const spacesArray = JSON.parse(configData);
    
    // Convert array to object with space name as key
    const spacesConfig = {};
    spacesArray.forEach(space => {
      spacesConfig[space.space] = space;
    });
    
    return spacesConfig;
  } catch (error) {
    console.error('Failed to load spaces configuration:', error);
    return {};
  }
}

/**
 * Get all space configurations
 */
function getSpaceConfigs() {
  return loadSpacesConfig();
}

/**
 * Get configuration for a specific space
 */
function getSpaceConfig(spaceName) {
  const configs = loadSpacesConfig();
  return configs[spaceName] || null;
}

module.exports = {
  getSpaceConfigs,
  getSpaceConfig
};