/**
 * @fileoverview User management routes
 * 
 * Provides user administration functionality including:
 * - User registration and profile management
 * - Authentication and session handling
 * - User role and permission management
 * - Support for both session and token-based authentication
 * - User data persistence and retrieval
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const userStorage = require('../../auth/userStorage');

const router = express.Router();

/**
 * Authentication middleware to protect routes
 * Supports both session-based (cookies) and token-based (Authorization header) authentication
 */
function requireAuth(req, res, next) {
  // First, check if user is authenticated via session (for web clients)
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  // If not authenticated via session, check for Authorization header (for VS Code extension)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = userStorage.validateSessionToken(token);
    
    if (user) {
      // Set user on request object so other middleware can access it
      req.user = user;
      return next();
    }
  }
  
  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Get user's allowed spaces
 */
router.get('/spaces', requireAuth, (req, res) => {
  try {
    // Get current user from session
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Load spaces configuration
    const spacesFilePath = path.join(__dirname, '../../../../server-data/spaces.json');
    if (!fs.existsSync(spacesFilePath)) {
      return res.json([]);
    }
    
    const spacesData = fs.readFileSync(spacesFilePath, 'utf8');
    const allSpaces = JSON.parse(spacesData);
    
    // Get user's allowed spaces from their profile
    const userSpaces = req.user.spaces ? req.user.spaces.split(',').map(s => s.trim()) : [];
    
    // Filter available spaces to only include those the user has access to
    const allowedSpaces = allSpaces.filter(space => userSpaces.includes(space.space));
    
    res.json(allowedSpaces);
  } catch (error) {
    console.error('Error loading user spaces:', error);
    res.status(500).json({ error: 'Failed to load user spaces' });
  }
});

/**
 * Update user settings (password and spaces)
 */
router.put('/settings', requireAuth, async (req, res) => {
  try {
    // Get current user from session
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('[Settings] User from request:', { 
      id: req.user.id, 
      idType: typeof req.user.id,
      username: req.user.username 
    });

    // Debug: Show all users in storage
    const allUsers = userStorage.getAllUsers();
    console.log('[Settings] Total users in storage:', allUsers.length);
    console.log('[Settings] All users in storage:', allUsers.map(u => ({ id: u.id, idType: typeof u.id, username: u.username })));

    const { currentPassword, newPassword, spaces } = req.body;
    const userId = req.user.id;

    // Get current user data
    const currentUser = userStorage.findUserById(userId);
    console.log('[Settings] User found in storage:', currentUser ? { 
      id: currentUser.id, 
      idType: typeof currentUser.id,
      username: currentUser.username 
    } : 'null');
    
    // Debug: Try to find user with string and number versions
    const userByString = userStorage.findUserById(String(userId));
    const userByNumber = userStorage.findUserById(Number(userId));
    console.log('[Settings] User by string ID:', userByString ? userByString.username : 'null');
    console.log('[Settings] User by number ID:', userByNumber ? userByNumber.username : 'null');
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If password change is requested, validate current password
    if (newPassword && !currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change password' });
    }

    if (newPassword) {
      // Validate current password
      const isCurrentPasswordValid = await userStorage.validateUser(currentUser.username, currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Validate new password
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }
    }

    // Validate spaces
    if (!spaces || typeof spaces !== 'string') {
      return res.status(400).json({ error: 'Spaces must be provided as a comma-separated string' });
    }

    // Ensure Personal space is always included
    const spacesList = spaces.split(',').map(s => s.trim()).filter(s => s);
    if (!spacesList.includes('Personal')) {
      spacesList.unshift('Personal');
    }

    // Load spaces configuration to validate requested spaces
    const spacesFilePath = path.join(__dirname, '../../../../server-data/spaces.json');
    if (fs.existsSync(spacesFilePath)) {
      const spacesData = fs.readFileSync(spacesFilePath, 'utf8');
      const allSpaces = JSON.parse(spacesData);
      
      // Only allow spaces that exist and are public (except Personal which is always allowed)
      const validSpaces = spacesList.filter(spaceName => {
        if (spaceName === 'Personal') return true;
        const spaceConfig = allSpaces.find(s => s.space === spaceName);
        return spaceConfig && spaceConfig.visibility === 'public';
      });

      if (validSpaces.length !== spacesList.length) {
        return res.status(400).json({ error: 'One or more requested spaces are not available or not public' });
      }
    }

    // Update user data
    const updateData = {
      spaces: spacesList.join(', ')
    };

    if (newPassword) {
      updateData.password = newPassword;
    }

    // Use userStorage to update the user
    await userStorage.updateUser(userId, updateData);

    // Get updated user data
    const updatedUser = userStorage.findUserById(userId);
    
    // Return updated user data (without password)
    const userResponse = {
      id: updatedUser.id,
      username: updatedUser.username,
      createdAt: updatedUser.createdAt,
      roles: updatedUser.roles || [],
      spaces: updatedUser.spaces
    };

    res.json({
      message: 'Settings updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

module.exports = router;