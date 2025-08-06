/**
 * @fileoverview Configuration Manager for Architecture Artifacts Server Watcher
 * 
 * This module handles configuration loading, validation, and management for the
 * server watcher application. It supports multiple configuration sources including
 * config files, environment variables, and command line arguments.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-05
 */

const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

class ConfigManager {
  constructor() {
    this.config = {};
    this.configFile = null;
    
    // Default configuration
    this.defaults = {
      serverUrl: 'http://localhost:3001',
      apiKey: '',
      username: '',
      localPath: process.cwd(),
      remotePath: '',
      watchOptions: {
        ignoreInitial: false,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.DS_Store',
          '**/Thumbs.db',
          '**/*.tmp',
          '**/*.temp',
          '**/.*'
        ]
      },
      verbose: false,
      dryRun: false
    };
  }

  /**
   * Load configuration from multiple sources
   * @param {Object} options - Configuration options
   * @param {string} [options.configFile] - Path to configuration file
   * @param {Object} [options.cliArgs] - Command line arguments
   * @returns {Promise<Object>} Loaded configuration
   */
  async load(options = {}) {
    try {
      // Start with defaults
      this.config = { ...this.defaults };

      // Load environment variables from .env file
      await this.loadDotEnv();

      // Load from configuration file
      if (options.configFile) {
        await this.loadConfigFile(options.configFile);
      } else {
        // Try to find default config files
        await this.loadDefaultConfigFile();
      }

      // Load environment variables
      this.loadEnvironmentVariables();

      // Override with CLI arguments
      if (options.cliArgs) {
        this.loadCliArguments(options.cliArgs);
      }

      // Validate configuration
      this.validate();

      return this.config;
    } catch (error) {
      console.error(chalk.red('[CONFIG ERROR]'), error.message);
      throw error;
    }
  }

  /**
   * Load environment variables from .env file
   */
  async loadDotEnv() {
    const envFiles = [
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local'),
      path.join(__dirname, '..', '.env')
    ];

    for (const envFile of envFiles) {
      if (await fs.pathExists(envFile)) {
        console.log(chalk.blue('[CONFIG]'), `Loading environment from: ${envFile}`);
        dotenv.config({ path: envFile });
        break;
      }
    }
  }

  /**
   * Load configuration from a JSON file
   * @param {string} configFilePath - Path to configuration file
   */
  async loadConfigFile(configFilePath) {
    try {
      const resolvedPath = path.resolve(configFilePath);
      
      if (!(await fs.pathExists(resolvedPath))) {
        throw new Error(`Configuration file not found: ${resolvedPath}`);
      }

      console.log(chalk.blue('[CONFIG]'), `Loading configuration from: ${resolvedPath}`);
      
      const configData = await fs.readJSON(resolvedPath);
      this.config = { ...this.config, ...configData };
      this.configFile = resolvedPath;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Configuration file not found: ${configFilePath}`);
      } else if (error.name === 'SyntaxError') {
        throw new Error(`Invalid JSON in configuration file: ${configFilePath}`);
      }
      throw error;
    }
  }

  /**
   * Try to load default configuration files
   */
  async loadDefaultConfigFile() {
    const defaultFiles = [
      path.join(process.cwd(), 'watcher.config.json'),
      path.join(process.cwd(), 'watcher.json'),
      path.join(process.cwd(), '.watcherrc'),
      path.join(process.cwd(), '.watcherrc.json')
    ];

    for (const file of defaultFiles) {
      if (await fs.pathExists(file)) {
        await this.loadConfigFile(file);
        break;
      }
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadEnvironmentVariables() {
    const envMappings = {
      'WATCHER_SERVER_URL': 'serverUrl',
      'WATCHER_API_KEY': 'apiKey',
      'WATCHER_USERNAME': 'username',
      'WATCHER_LOCAL_PATH': 'localPath',
      'WATCHER_REMOTE_PATH': 'remotePath',
      'WATCHER_VERBOSE': 'verbose',
      'WATCHER_DRY_RUN': 'dryRun'
    };

    for (const [envVar, configKey] of Object.entries(envMappings)) {
      if (process.env[envVar]) {
        let value = process.env[envVar];
        
        // Convert string booleans to actual booleans
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        
        this.config[configKey] = value;
        console.log(chalk.blue('[CONFIG]'), `Loaded ${configKey} from environment variable`);
      }
    }
  }

  /**
   * Load configuration from CLI arguments
   * @param {Object} cliArgs - Command line arguments
   */
  loadCliArguments(cliArgs) {
    const argMappings = {
      'server': 'serverUrl',
      'apiKey': 'apiKey',
      'username': 'username',
      'localPath': 'localPath',
      'remotePath': 'remotePath',
      'verbose': 'verbose',
      'dryRun': 'dryRun'
    };

    for (const [cliArg, configKey] of Object.entries(argMappings)) {
      if (cliArgs[cliArg] !== undefined) {
        this.config[configKey] = cliArgs[cliArg];
      }
    }
  }

  /**
   * Validate the configuration
   */
  validate() {
    const required = ['serverUrl', 'apiKey', 'username', 'localPath'];
    const missing = [];

    for (const key of required) {
      if (!this.config[key]) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Validate server URL format
    try {
      new URL(this.config.serverUrl);
    } catch (error) {
      throw new Error(`Invalid server URL: ${this.config.serverUrl}`);
    }

    // Validate local path exists
    if (!fs.pathExistsSync(this.config.localPath)) {
      throw new Error(`Local path does not exist: ${this.config.localPath}`);
    }

    // Validate API key format
    if (!this.config.apiKey.startsWith('ak_')) {
      throw new Error('API key must start with "ak_"');
    }
  }

  /**
   * Save current configuration to file
   * @param {string} [filePath] - Path to save configuration file
   */
  async save(filePath) {
    try {
      const saveFile = filePath || this.configFile || path.join(process.cwd(), 'watcher.config.json');
      
      // Remove sensitive data before saving
      const configToSave = { ...this.config };
      if (configToSave.apiKey) {
        configToSave.apiKey = '***REDACTED***';
      }

      await fs.writeJSON(saveFile, configToSave, { spaces: 2 });
      console.log(chalk.green('[CONFIG]'), `Configuration saved to: ${saveFile}`);
      
    } catch (error) {
      console.error(chalk.red('[CONFIG ERROR]'), `Failed to save configuration:`, error.message);
      throw error;
    }
  }

  /**
   * Create a sample configuration file
   * @param {string} filePath - Path to create the sample file
   */
  async createSampleConfig(filePath = 'watcher.config.json') {
    const sampleConfig = {
      serverUrl: 'http://localhost:3001',
      apiKey: 'ak_your_api_key_here',
      username: 'your_username',
      localPath: './sync-folder',
      remotePath: 'synced-files',
      watchOptions: {
        ignoreInitial: false,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.DS_Store',
          '**/Thumbs.db',
          '**/*.tmp',
          '**/*.temp',
          '**/.*'
        ]
      },
      verbose: false,
      dryRun: false
    };

    try {
      await fs.writeJSON(filePath, sampleConfig, { spaces: 2 });
      console.log(chalk.green('[CONFIG]'), `Sample configuration created: ${filePath}`);
      console.log(chalk.yellow('[CONFIG]'), 'Please edit the configuration file with your actual values');
      
    } catch (error) {
      console.error(chalk.red('[CONFIG ERROR]'), `Failed to create sample configuration:`, error.message);
      throw error;
    }
  }

  /**
   * Print current configuration (without sensitive data)
   */
  printConfig() {
    const safeCopy = { ...this.config };
    if (safeCopy.apiKey) {
      safeCopy.apiKey = safeCopy.apiKey.substring(0, 12) + '...';
    }

    console.log(chalk.cyan('\n=== Configuration ==='));
    console.log(JSON.stringify(safeCopy, null, 2));
    console.log(chalk.cyan('=====================\n'));
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = undefined) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Set a configuration value
   * @param {string} key - Configuration key
   * @param {*} value - Configuration value
   */
  set(key, value) {
    this.config[key] = value;
  }
}

module.exports = ConfigManager;