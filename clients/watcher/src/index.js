#!/usr/bin/env node

/**
 * @fileoverview Design Artifacts server. Watcher CLI
 * 
 * This is the main entry point for the server watcher application that provides
 * real-time file synchronization between local directories and user's personal
 * space in the Design Artifacts server..
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2025-08-05
 */

require('dotenv').config();

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const ConfigManager = require('./ConfigManager');
const ApiClient = require('./ApiClient');
const FileWatcher = require('./FileWatcher');

const program = new Command();

// Global variables
let fileWatcher = null;
let configManager = null;

/**
 * Display application banner
 */
function displayBanner() {
  console.log(chalk.cyan(`
  ╔══════════════════════════════════════════════════════════╗
  ║           Design Artifacts server. Watcher         ║
  ║                     File Sync Tool                      ║
  ╚══════════════════════════════════════════════════════════╝
  `));
}

/**
 * Handle graceful shutdown
 */
async function handleShutdown() {
  console.log(chalk.yellow('\n\nReceived shutdown signal...'));
  
  if (fileWatcher) {
    try {
      await fileWatcher.stop();
      console.log(chalk.green('File watcher stopped gracefully'));
    } catch (error) {
      console.error(chalk.red('Error stopping file watcher:'), error.message);
    }
  }
  
  console.log(chalk.green('Shutdown complete'));
  process.exit(0);
}

/**
 * Wait for server to become available with retry logic
 * @param {ApiClient} apiClient - The API client to test
 * @param {Object} options - Retry options
 * @returns {Promise<boolean>} True when server is available
 */
async function waitForServer(apiClient, options = {}) {
  const {
    maxRetries = 30,
    retryInterval = 5000, // 5 seconds
    verbose = false
  } = options;

  console.log(chalk.blue('[INFO]'), 'Waiting for server to become available...');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (verbose) {
        console.log(chalk.blue('[INFO]'), `Connection attempt ${attempt}/${maxRetries}...`);
      }
      
      const connected = await apiClient.testConnection();
      if (connected) {
        // Also test API key authentication
        try {
          await apiClient.getFileTree();
          console.log(chalk.green('[SUCCESS]'), `Connected to server successfully (attempt ${attempt})`);
          return true;
        } catch (authError) {
          if (verbose) {
            console.log(chalk.yellow('[WARN]'), `Server reachable but authentication failed (attempt ${attempt}): ${authError.message}`);
          }
        }
      }
    } catch (error) {
      if (verbose) {
        console.log(chalk.yellow('[WARN]'), `Connection failed (attempt ${attempt}): ${error.message}`);
      }
    }
    
    if (attempt < maxRetries) {
      console.log(chalk.blue('[INFO]'), `Server not available, waiting ${retryInterval/1000}s before retry ${attempt + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  
  return false;
}

// Set up graceful shutdown handlers
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

/**
 * Watch command - Start file watching and syncing
 */
program
  .command('watch')
  .description('Start watching local directory and sync changes to server')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-s, --server <url>', 'Server URL')
  .option('-k, --api-key <key>', 'API key for authentication')
  .option('-u, --username <username>', 'Username for personal space')
  .option('-l, --local-path <path>', 'Local directory to watch')
  .option('-r, --remote-path <path>', 'Remote directory path (relative to personal space)')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-d, --dry-run', 'Dry run mode (no actual changes)')
  .action(async (options) => {
    try {
      displayBanner();
      
      // Load configuration
      configManager = new ConfigManager();
      const config = await configManager.load({
        configFile: options.config,
        cliArgs: options
      });

      if (config.verbose) {
        console.log(chalk.blue('[INFO]'), 'Verbose logging enabled');
        configManager.printConfig();
      }

      // Create API client
      const apiClient = new ApiClient({
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        username: config.username,
        verbose: config.verbose,
        operationRetry: config.operationRetry
      });

      // Wait for server to become available with retry logic
      const retryConfig = config.serverRetry || { maxRetries: 60, retryInterval: 5000 };
      const connected = await waitForServer(apiClient, {
        maxRetries: retryConfig.maxRetries,
        retryInterval: retryConfig.retryInterval,
        verbose: config.verbose
      });
      
      if (!connected) {
        const waitTime = (retryConfig.maxRetries * retryConfig.retryInterval) / 1000 / 60;
        throw new Error(`Server did not become available after ${waitTime} minutes (${retryConfig.maxRetries} attempts). Please check your server configuration and ensure it's running at ${config.serverUrl}.`);
      }

      // Create file watcher
      fileWatcher = new FileWatcher({
        localPath: config.localPath,
        remotePath: config.remotePath,
        apiClient: apiClient,
        options: {
          ...config.watchOptions,
          ignoreInitial: false
        }
      });

      // Start watching
      console.log(chalk.blue('[INFO]'), `Starting file watcher...`);
      console.log(chalk.blue('[INFO]'), `Local path: ${config.localPath}`);
      console.log(chalk.blue('[INFO]'), `Remote path: ${config.remotePath || 'root'}`);
      console.log(chalk.blue('[INFO]'), `Dry run mode: ${config.dryRun ? 'enabled' : 'disabled'}`);
      
      if (config.dryRun) {
        console.log(chalk.yellow('[WARNING]'), 'Running in dry run mode - no changes will be made to the server');
      }

      await fileWatcher.start();

      // Display status
      console.log(chalk.green('[SUCCESS]'), 'File watcher started successfully');
      console.log(chalk.blue('[INFO]'), 'Press Ctrl+C to stop watching...\n');

      // Set up periodic status reporting
      if (config.verbose) {
        setInterval(() => {
          fileWatcher.printStats();
        }, 30000); // Print stats every 30 seconds
      }

      // Keep the process alive
      await new Promise(() => {}); // Run indefinitely

    } catch (error) {
      console.error(chalk.red('[ERROR]'), error.message);
      process.exit(1);
    }
  });

/**
 * Sync command - Perform one-time directory sync
 */
program
  .command('sync')
  .description('Perform one-time directory synchronization')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-s, --server <url>', 'Server URL')
  .option('-k, --api-key <key>', 'API key for authentication')
  .option('-u, --username <username>', 'Username for personal space')
  .option('-l, --local-path <path>', 'Local directory to sync')
  .option('-r, --remote-path <path>', 'Remote directory path (relative to personal space)')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-d, --dry-run', 'Dry run mode (no actual changes)')
  .action(async (options) => {
    try {
      displayBanner();
      
      // Load configuration
      configManager = new ConfigManager();
      const config = await configManager.load({
        configFile: options.config,
        cliArgs: options
      });

      if (config.verbose) {
        configManager.printConfig();
      }

      // Create API client
      const apiClient = new ApiClient({
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        username: config.username,
        verbose: config.verbose,
        operationRetry: config.operationRetry
      });

      // Test connection
      console.log(chalk.blue('[INFO]'), 'Testing connection to server...');
      const connected = await apiClient.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to server. Please check your configuration.');
      }

      // Perform sync
      console.log(chalk.blue('[INFO]'), 'Starting directory synchronization...');
      console.log(chalk.blue('[INFO]'), `Local path: ${config.localPath}`);
      console.log(chalk.blue('[INFO]'), `Remote path: ${config.remotePath || 'root'}`);
      console.log(chalk.blue('[INFO]'), `Dry run mode: ${config.dryRun ? 'enabled' : 'disabled'}`);

      const stats = await apiClient.syncDirectory(config.localPath, config.remotePath, {
        dryRun: config.dryRun
      });

      // Display results
      console.log(chalk.green('\n=== Sync Results ==='));
      console.log(`Files Created: ${stats.created}`);
      console.log(`Files Updated: ${stats.updated}`);
      console.log(`Files Deleted: ${stats.deleted}`);
      console.log(`Errors: ${stats.errors}`);
      console.log(chalk.green('==================\n'));

      if (stats.errors > 0) {
        console.log(chalk.yellow('[WARNING]'), `Sync completed with ${stats.errors} errors`);
        process.exit(1);
      } else {
        console.log(chalk.green('[SUCCESS]'), 'Directory synchronization completed successfully');
      }

    } catch (error) {
      console.error(chalk.red('[ERROR]'), error.message);
      process.exit(1);
    }
  });

/**
 * Config command - Manage configuration
 */
program
  .command('config')
  .description('Manage configuration')
  .option('--create [file]', 'Create sample configuration file')
  .option('--view [file]', 'View current configuration')
  .option('--save [file]', 'Save current configuration to file')
  .action(async (options) => {
    try {
      configManager = new ConfigManager();

      if (options.create !== undefined) {
        const configFile = typeof options.create === 'string' ? options.create : 'watcher.config.json';
        await configManager.createSampleConfig(configFile);
        return;
      }

      if (options.view !== undefined) {
        const configFile = typeof options.view === 'string' ? options.view : undefined;
        const config = await configManager.load({
          configFile: configFile
        });
        configManager.printConfig();
        return;
      }

      if (options.save !== undefined) {
        const configFile = typeof options.save === 'string' ? options.save : undefined;
        const config = await configManager.load();
        await configManager.save(configFile);
        return;
      }

      // Default: show help
      console.log(chalk.yellow('Please specify an option for the config command. Use --help for more information.'));

    } catch (error) {
      console.error(chalk.red('[CONFIG ERROR]'), error.message);
      console.error(chalk.red('[ERROR]'), error.stack);
      process.exit(1);
    }
  });

/**
 * Test command - Test connection and configuration
 */
program
  .command('test')
  .description('Test connection and configuration')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-s, --server <url>', 'Server URL')
  .option('-k, --api-key <key>', 'API key for authentication')
  .option('-u, --username <username>', 'Username for personal space')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      displayBanner();
      
      // Load configuration
      configManager = new ConfigManager();
      const config = await configManager.load({
        configFile: options.config,
        cliArgs: options
      });

      console.log(chalk.blue('[INFO]'), 'Testing configuration...');
      
      if (config.verbose) {
        configManager.printConfig();
      }

      // Create API client
      const apiClient = new ApiClient({
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        username: config.username,
        verbose: config.verbose,
        operationRetry: config.operationRetry
      });

      // Test connection with brief retry for test command
      const connected = await waitForServer(apiClient, {
        maxRetries: 3, // Only try 3 times for test command
        retryInterval: 2000, // 2 second intervals
        verbose: config.verbose
      });
      
      if (connected) {
        console.log(chalk.green('[SUCCESS]'), 'All tests passed - configuration is valid');
      } else {
        console.log(chalk.red('[ERROR]'), 'Server is not available after 3 attempts');
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('[ERROR]'), error.message);
      process.exit(1);
    }
  });

// Set up program metadata
program
  .name('dt-watcher')
  .description('Design Artifacts server. Watcher - File synchronization tool')
  .version('1.0.0');

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!program.args.length) {
  displayBanner();
  program.help();
}