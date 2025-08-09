const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PluginLoader {
  constructor(pluginsDir) {
    this.pluginsDir = pluginsDir;
    this.loadedPlugins = new Map();
    this.installedDependencies = new Set();
  }

  async loadAllPlugins() {
    try {
      const pluginDirs = this.getPluginDirectories();
      console.log(`🔌 Found ${pluginDirs.length} plugins to load`);

      for (const pluginDir of pluginDirs) {
        try {
          await this.loadPlugin(pluginDir);
        } catch (error) {
          console.error(`❌ Failed to load plugin "${pluginDir}":`, error.message);
        }
      }

      console.log(`✅ Successfully loaded ${this.loadedPlugins.size} plugins`);
      return Array.from(this.loadedPlugins.values());
    } catch (error) {
      console.error('❌ Error loading plugins:', error);
      return [];
    }
  }

  getPluginDirectories() {
    if (!fs.existsSync(this.pluginsDir)) {
      console.log('📁 Plugins directory does not exist, creating it...');
      fs.mkdirSync(this.pluginsDir, { recursive: true });
      return [];
    }

    return fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

  async loadPlugin(pluginName) {
    const pluginPath = path.join(this.pluginsDir, pluginName);
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const indexPath = path.join(pluginPath, 'index.js');

    // Verify plugin structure
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`Missing package.json for plugin "${pluginName}"`);
    }

    if (!fs.existsSync(indexPath)) {
      throw new Error(`Missing index.js for plugin "${pluginName}"`);
    }

    // Read plugin package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Install plugin dependencies if needed
    await this.installPluginDependencies(pluginPath, packageJson);

    // Clear module cache for hot reloading during development
    const moduleId = require.resolve(indexPath);
    delete require.cache[moduleId];

    // Load the plugin module
    const pluginModule = require(indexPath);

    // Validate plugin structure
    this.validatePlugin(pluginModule, pluginName);

    // Store loaded plugin
    const pluginInfo = {
      name: pluginModule.name || pluginName,
      version: pluginModule.version || packageJson.version,
      path: pluginPath,
      module: pluginModule,
      packageJson: packageJson,
      loadedAt: new Date().toISOString()
    };

    this.loadedPlugins.set(pluginName, pluginInfo);
    console.log(`✅ Loaded plugin: ${pluginInfo.name} v${pluginInfo.version}`);

    return pluginInfo;
  }

  async installPluginDependencies(pluginPath, packageJson) {
    const dependencyKey = `${pluginPath}:${JSON.stringify(packageJson.dependencies || {})}`;
    
    if (this.installedDependencies.has(dependencyKey)) {
      return; // Already installed
    }

    const dependencies = packageJson.dependencies;
    if (!dependencies || Object.keys(dependencies).length === 0) {
      return; // No dependencies to install
    }

    console.log(`📦 Installing dependencies for plugin at ${pluginPath}...`);

    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], {
        cwd: pluginPath,
        stdio: 'pipe'
      });

      let output = '';
      npm.stdout.on('data', (data) => {
        output += data.toString();
      });

      npm.stderr.on('data', (data) => {
        output += data.toString();
      });

      npm.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Dependencies installed for ${path.basename(pluginPath)}`);
          this.installedDependencies.add(dependencyKey);
          resolve();
        } else {
          console.error(`❌ Failed to install dependencies for ${path.basename(pluginPath)}:`, output);
          reject(new Error(`npm install failed with code ${code}`));
        }
      });

      npm.on('error', (error) => {
        console.error(`❌ Error running npm install:`, error);
        reject(error);
      });
    });
  }

  validatePlugin(pluginModule, pluginName) {
    if (!pluginModule.name) {
      console.warn(`⚠️ Plugin "${pluginName}" missing name property`);
    }

    if (!pluginModule.files && !pluginModule.create) {
      throw new Error(`Plugin "${pluginName}" must export either 'files' or 'create' property`);
    }

    if (pluginModule.files && typeof pluginModule.files !== 'object') {
      throw new Error(`Plugin "${pluginName}" 'files' export must be an object`);
    }

    if (pluginModule.create && typeof pluginModule.create !== 'function') {
      throw new Error(`Plugin "${pluginName}" 'create' export must be a function`);
    }
  }

  getPlugin(pluginName) {
    return this.loadedPlugins.get(pluginName);
  }

  getAllPlugins() {
    return Array.from(this.loadedPlugins.values());
  }

  async reloadPlugin(pluginName) {
    console.log(`🔄 Reloading plugin: ${pluginName}`);
    
    // Remove from loaded plugins
    this.loadedPlugins.delete(pluginName);
    
    // Reload the plugin
    return await this.loadPlugin(pluginName);
  }

  unloadPlugin(pluginName) {
    const plugin = this.loadedPlugins.get(pluginName);
    if (plugin) {
      // Clear from require cache
      const moduleId = require.resolve(plugin.path + '/index.js');
      delete require.cache[moduleId];
      
      this.loadedPlugins.delete(pluginName);
      console.log(`🗑️ Unloaded plugin: ${pluginName}`);
      return true;
    }
    return false;
  }

  createPluginMiddleware(app) {
    return {
      // Middleware to intercept requests before they reach routes
      interceptRequest: (req, res, next) => {
        const plugins = this.getAllPlugins();
        let pluginIndex = 0;

        const processNextPlugin = () => {
          if (pluginIndex >= plugins.length) {
            return next(); // All plugins processed, continue to routes
          }

          const plugin = plugins[pluginIndex];
          pluginIndex++;

          try {
            // Check if plugin has files.intercept
            if (plugin.module.files && plugin.module.files.intercept) {
              plugin.module.files.intercept(req, res, processNextPlugin);
            } else if (plugin.module.create) {
              // Create instance and use middleware
              const instance = plugin.module.create();
              if (instance.middleware) {
                instance.middleware(req, res, processNextPlugin);
              } else {
                processNextPlugin();
              }
            } else {
              processNextPlugin();
            }
          } catch (error) {
            console.error(`❌ Error in plugin ${plugin.name}:`, error);
            processNextPlugin(); // Continue with next plugin even if one fails
          }
        };

        processNextPlugin();
      },

      // Middleware to intercept responses
      interceptResponse: (req, res, next) => {
        const originalSend = res.send;
        const pluginLoader = this;
        
        res.send = function(data) {
          const plugins = Array.from(pluginLoader.loadedPlugins.values()).reverse(); // Process in reverse order for responses
          
          let processedData = data;
          
          for (const plugin of plugins) {
            try {
              if (plugin.module.create) {
                const instance = plugin.module.create();
                if (instance.responseHandler) {
                  processedData = instance.responseHandler(req, res, processedData);
                }
              }
            } catch (error) {
              console.error(`❌ Error in plugin ${plugin.name} response handler:`, error);
              // Continue processing with other plugins
            }
          }
          
          originalSend.call(this, processedData);
        };
        
        next();
      }
    };
  }

  getPluginInfo() {
    return this.getAllPlugins().map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.packageJson.description || 'No description available',
      author: plugin.packageJson.author || 'Unknown',
      loadedAt: plugin.loadedAt,
      dependencies: Object.keys(plugin.packageJson.dependencies || {}),
      hasFiles: !!plugin.module.files,
      hasCreate: !!plugin.module.create
    }));
  }
}

module.exports = PluginLoader;