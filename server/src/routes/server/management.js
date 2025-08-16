/**
 * @fileoverview Server management API routes.
 * Handles users, spaces, plugins, and API monitoring endpoints.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireServerAuth } = require('../../middleware/auth');
const router = express.Router();

// API endpoint to get monitoring data
router.get('/api-monitor-data', (req, res) => {
  // This will be passed from the main server file
  const apiCalls = req.app.locals.apiCalls || [];
  res.json(apiCalls);
});

// User management API endpoints
router.get('/api/users', requireServerAuth, (req, res) => {
  try {
    const users = require(path.join(__dirname, '../../../..', 'server-data', 'users.json'));
    // Return users without password field
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      roles: user.roles || [],
      spaces: user.spaces || ''
    }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.put('/api/users/:id', requireServerAuth, (req, res) => {
  try {
    const { username, roles, spaces } = req.body;
    const userId = req.params.id;
    
    // Use the correct path to users.json
    const usersFilePath = path.join(__dirname, '../../../..', 'server-data', 'users.json');
    
    // Read the current users data
    const usersData = fs.readFileSync(usersFilePath, 'utf8');
    const users = JSON.parse(usersData);
    
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user data
    users[userIndex].username = username;
    users[userIndex].roles = roles;
    users[userIndex].spaces = spaces;
    
    // Write back to file
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    
    // Return updated user without password
    const updatedUser = {
      id: users[userIndex].id,
      username: users[userIndex].username,
      createdAt: users[userIndex].createdAt,
      roles: users[userIndex].roles,
      spaces: users[userIndex].spaces
    };
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Spaces management API endpoints
router.get('/api/spaces', requireServerAuth, (req, res) => {
  try {
    const spacesFilePath = path.join(__dirname, '../../../..', 'server-data', 'spaces.json');
    
    if (!fs.existsSync(spacesFilePath)) {
      return res.json([]);
    }
    
    const spacesData = fs.readFileSync(spacesFilePath, 'utf8');
    const spaces = JSON.parse(spacesData);
    res.json(spaces);
  } catch (error) {
    console.error('Error loading spaces:', error);
    res.status(500).json({ error: 'Failed to load spaces' });
  }
});

router.post('/api/spaces', requireServerAuth, (req, res) => {
  try {
    const { space, access, filing } = req.body;
    
    if (!space || !access || !filing) {
      return res.status(400).json({ error: 'Missing required fields: space, access, filing' });
    }
    
    const spacesFilePath = path.join(__dirname, '../../../..', 'server-data', 'spaces.json');
    
    let spaces = [];
    if (fs.existsSync(spacesFilePath)) {
      const spacesData = fs.readFileSync(spacesFilePath, 'utf8');
      spaces = JSON.parse(spacesData);
    }
    
    // Check if space name already exists
    if (spaces.some(s => s.space === space)) {
      return res.status(400).json({ error: 'Space name already exists' });
    }
    
    const newSpace = { space, access, filing };
    spaces.push(newSpace);
    
    fs.writeFileSync(spacesFilePath, JSON.stringify(spaces, null, 2));
    
    res.json(newSpace);
  } catch (error) {
    console.error('Error creating space:', error);
    res.status(500).json({ error: 'Failed to create space' });
  }
});

router.put('/api/spaces/:index', requireServerAuth, (req, res) => {
  try {
    const { space, access, filing } = req.body;
    const spaceIndex = parseInt(req.params.index);
    
    if (!space || !access || !filing) {
      return res.status(400).json({ error: 'Missing required fields: space, access, filing' });
    }
    
    const spacesFilePath = path.join(__dirname, '../../../..', 'server-data', 'spaces.json');
    
    if (!fs.existsSync(spacesFilePath)) {
      return res.status(404).json({ error: 'Spaces file not found' });
    }
    
    const spacesData = fs.readFileSync(spacesFilePath, 'utf8');
    const spaces = JSON.parse(spacesData);
    
    if (spaceIndex < 0 || spaceIndex >= spaces.length) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    // Check if space name already exists (excluding current space)
    if (spaces.some((s, idx) => s.space === space && idx !== spaceIndex)) {
      return res.status(400).json({ error: 'Space name already exists' });
    }
    
    spaces[spaceIndex] = { space, access, filing };
    
    fs.writeFileSync(spacesFilePath, JSON.stringify(spaces, null, 2));
    
    res.json(spaces[spaceIndex]);
  } catch (error) {
    console.error('Error updating space:', error);
    res.status(500).json({ error: 'Failed to update space' });
  }
});

router.delete('/api/spaces/:index', requireServerAuth, (req, res) => {
  try {
    const spaceIndex = parseInt(req.params.index);
    
    const spacesFilePath = path.join(__dirname, '../../../..', 'server-data', 'spaces.json');
    
    if (!fs.existsSync(spacesFilePath)) {
      return res.status(404).json({ error: 'Spaces file not found' });
    }
    
    const spacesData = fs.readFileSync(spacesFilePath, 'utf8');
    const spaces = JSON.parse(spacesData);
    
    if (spaceIndex < 0 || spaceIndex >= spaces.length) {
      return res.status(404).json({ error: 'Space not found' });
    }
    
    const deletedSpace = spaces.splice(spaceIndex, 1)[0];
    
    fs.writeFileSync(spacesFilePath, JSON.stringify(spaces, null, 2));
    
    res.json({ message: 'Space deleted successfully', deletedSpace });
  } catch (error) {
    console.error('Error deleting space:', error);
    res.status(500).json({ error: 'Failed to delete space' });
  }
});

// Plugin management routes (requires pluginLoader from main server)
router.get('/api/plugins', requireServerAuth, (req, res) => {
  try {
    const pluginLoader = req.app.locals.pluginLoader;
    if (!pluginLoader) {
      return res.status(500).json({ error: 'Plugin loader not available' });
    }
    
    const pluginInfo = pluginLoader.getPluginInfo();
    res.json(pluginInfo);
  } catch (error) {
    console.error('Error getting plugin info:', error);
    res.status(500).json({ error: 'Failed to get plugin information' });
  }
});

router.post('/api/plugins/:name/reload', requireServerAuth, async (req, res) => {
  try {
    const pluginLoader = req.app.locals.pluginLoader;
    if (!pluginLoader) {
      return res.status(500).json({ error: 'Plugin loader not available' });
    }
    
    const pluginName = req.params.name;
    const reloadedPlugin = await pluginLoader.reloadPlugin(pluginName);
    
    // Recreate plugin middleware (this will need to be handled in main server)
    req.app.locals.pluginMiddleware = pluginLoader.createPluginMiddleware(req.app);
    
    res.json({ 
      message: `Plugin "${pluginName}" reloaded successfully`, 
      plugin: reloadedPlugin 
    });
  } catch (error) {
    console.error('Error reloading plugin:', error);
    res.status(500).json({ error: `Failed to reload plugin: ${error.message}` });
  }
});

router.delete('/api/plugins/:name', requireServerAuth, (req, res) => {
  try {
    const pluginLoader = req.app.locals.pluginLoader;
    if (!pluginLoader) {
      return res.status(500).json({ error: 'Plugin loader not available' });
    }
    
    const pluginName = req.params.name;
    const success = pluginLoader.unloadPlugin(pluginName);
    
    if (success) {
      // Recreate plugin middleware (this will need to be handled in main server)
      req.app.locals.pluginMiddleware = pluginLoader.createPluginMiddleware(req.app);
      res.json({ message: `Plugin "${pluginName}" unloaded successfully` });
    } else {
      res.status(404).json({ error: 'Plugin not found' });
    }
  } catch (error) {
    console.error('Error unloading plugin:', error);
    res.status(500).json({ error: `Failed to unload plugin: ${error.message}` });
  }
});

module.exports = router;