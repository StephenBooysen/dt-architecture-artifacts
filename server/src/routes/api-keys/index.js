/**
 * @fileoverview API Key management routes
 * 
 * Provides API key management functionality for users including:
 * - Generation of new API keys
 * - Listing user's API keys
 * - Revoking API keys
 * - API key-based authentication
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-05
 */

const express = require('express');
const crypto = require('crypto');
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
  
  // If not authenticated via session, check for Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Try session token first
    let user = userStorage.validateSessionToken(token);
    
    // If not a session token, try API key authentication
    if (!user) {
      user = userStorage.authenticateByApiKey(token);
    }
    
    if (user) {
      // Set user on request object so other middleware can access it
      req.user = user;
      return next();
    }
  }
  
  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Generate a new API key for the current user
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'API key name is required' });
    }
    
    const userId = req.user.id;
    
    // Generate a secure API key
    const apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
    
    // Create API key record
    const keyData = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim() || '',
      key: apiKey,
      userId: userId,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      isActive: true
    };
    
    // Store the API key
    userStorage.createApiKey(keyData);
    
    // Return the API key (this is the only time it will be returned in full)
    res.json({
      message: 'API key generated successfully',
      apiKey: {
        id: keyData.id,
        name: keyData.name,
        description: keyData.description,
        key: apiKey, // Full key is returned only on creation
        createdAt: keyData.createdAt,
        lastUsed: keyData.lastUsed,
        isActive: keyData.isActive
      }
    });
    
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

/**
 * List all API keys for the current user (without revealing the actual keys)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's API keys
    const apiKeys = userStorage.getUserApiKeys(userId);
    
    // Return keys without the actual key values
    const safeKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      description: key.description,
      keyPreview: key.key.substring(0, 12) + '...' + key.key.substring(key.key.length - 4),
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive
    }));
    
    res.json({
      apiKeys: safeKeys,
      count: safeKeys.length
    });
    
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * Revoke an API key
 */
router.delete('/:keyId', requireAuth, async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.user.id;
    
    if (!keyId) {
      return res.status(400).json({ error: 'API key ID is required' });
    }
    
    // Verify the key belongs to the user
    const apiKey = userStorage.getApiKeyById(keyId);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    if (apiKey.userId !== userId) {
      return res.status(403).json({ error: 'You can only revoke your own API keys' });
    }
    
    // Revoke the API key
    userStorage.revokeApiKey(keyId);
    
    res.json({
      message: 'API key revoked successfully',
      keyId: keyId
    });
    
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * Update an API key (name/description only)
 */
router.put('/:keyId', requireAuth, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;
    
    if (!keyId) {
      return res.status(400).json({ error: 'API key ID is required' });
    }
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'API key name is required' });
    }
    
    // Verify the key belongs to the user
    const apiKey = userStorage.getApiKeyById(keyId);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    if (apiKey.userId !== userId) {
      return res.status(403).json({ error: 'You can only update your own API keys' });
    }
    
    // Update the API key
    const updateData = {
      name: name.trim(),
      description: description?.trim() || ''
    };
    
    userStorage.updateApiKey(keyId, updateData);
    
    // Get updated key
    const updatedKey = userStorage.getApiKeyById(keyId);
    
    res.json({
      message: 'API key updated successfully',
      apiKey: {
        id: updatedKey.id,
        name: updatedKey.name,
        description: updatedKey.description,
        keyPreview: updatedKey.key.substring(0, 12) + '...' + updatedKey.key.substring(updatedKey.key.length - 4),
        createdAt: updatedKey.createdAt,
        lastUsed: updatedKey.lastUsed,
        isActive: updatedKey.isActive
      }
    });
    
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

module.exports = router;