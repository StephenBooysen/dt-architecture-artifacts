/**
 * @fileoverview User storage and session management system
 * 
 * Provides comprehensive user management functionality including:
 * - User registration and authentication with bcrypt password hashing
 * - Google OAuth integration for social login
 * - Session token generation and validation
 * - File-based user persistence with JSON storage
 * - Role-based access control and space management
 * - Session cleanup and security management
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, '../../../server-data/users.json');
const API_KEYS_FILE = path.join(__dirname, '../../../server-data/api-keys.json');

class UserStorage {
  constructor() {
    this.users = [];
    this.apiKeys = []; // API keys storage
    this.sessions = new Map(); // In-memory session storage: sessionId -> { userId, expiresAt }
    this.loadUsersSync();
    this.loadApiKeysSync();
  }

  loadUsersSync() {
    try {
      const data = require('fs').readFileSync(USERS_FILE, 'utf8');
      this.users = JSON.parse(data);
      console.log('Users loaded synchronously:', this.users.length);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.users = [];
        console.log('Users file not found, starting with empty array');
      } else {
        console.error('Error loading users:', error);
        this.users = [];
      }
    }
  }

  async loadUsers() {
    try {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      this.users = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.users = [];
        await this.saveUsers();
      } else {
        console.error('Error loading users:', error);
        this.users = [];
      }
    }
  }

  async saveUsers() {
    try {
      await fs.writeFile(USERS_FILE, JSON.stringify(this.users, null, 2));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  loadApiKeysSync() {
    try {
      const data = require('fs').readFileSync(API_KEYS_FILE, 'utf8');
      this.apiKeys = JSON.parse(data);
      console.log('API keys loaded synchronously:', this.apiKeys.length);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.apiKeys = [];
        console.log('API keys file not found, starting with empty array');
      } else {
        console.error('Error loading API keys:', error);
        this.apiKeys = [];
      }
    }
  }

  async loadApiKeys() {
    try {
      const data = await fs.readFile(API_KEYS_FILE, 'utf8');
      this.apiKeys = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.apiKeys = [];
        await this.saveApiKeys();
      } else {
        console.error('Error loading API keys:', error);
        this.apiKeys = [];
      }
    }
  }

  async saveApiKeys() {
    try {
      await fs.writeFile(API_KEYS_FILE, JSON.stringify(this.apiKeys, null, 2));
    } catch (error) {
      console.error('Error saving API keys:', error);
    }
  }

  async createUser(username, password) {
    if (this.findUserByUsername(username)) {
      throw new Error('User already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const user = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      roles: ['read', 'write'], // Default roles for all new users (write required for client login)
      spaces: 'Personal' // Default space access for all new users
    };

    this.users.push(user);
    await this.saveUsers();
    
    return { id: user.id, username: user.username, createdAt: user.createdAt, roles: user.roles, spaces: user.spaces };
  }

  async createGoogleUser(googleUserData) {
    // Ensure username is unique
    let username = googleUserData.username;
    let counter = 1;
    while (this.findUserByUsername(username)) {
      username = `${googleUserData.username}_${counter}`;
      counter++;
    }

    const user = {
      id: Date.now().toString(),
      username,
      googleId: googleUserData.googleId,
      email: googleUserData.email,
      name: googleUserData.name,
      picture: googleUserData.picture,
      createdAt: new Date().toISOString(),
      roles: ['read', 'write'], // Default roles for all new users (write required for client login)
      spaces: 'Personal' // Default space access for all new users
    };

    this.users.push(user);
    await this.saveUsers();
    
    return { id: user.id, username: user.username, email: user.email, name: user.name, picture: user.picture, createdAt: user.createdAt, roles: user.roles, spaces: user.spaces };
  }

  linkGoogleAccount(userId, googleId) {
    const user = this.findUserById(userId);
    if (user) {
      user.googleId = googleId;
      this.saveUsers();
      return true;
    }
    return false;
  }

  findUserByUsername(username) {
    return this.users.find(user => user.username === username);
  }

  findUserById(id) {
    console.log('[UserStorage] Finding user by ID:', { id, idType: typeof id });
    console.log('[UserStorage] Available user IDs:', this.users.map(u => ({ id: u.id, idType: typeof u.id, username: u.username })));
    const user = this.users.find(user => user.id === id);
    console.log('[UserStorage] Found user:', user ? { id: user.id, username: user.username } : 'null');
    return user;
  }

  findUserByGoogleId(googleId) {
    return this.users.find(user => user.googleId === googleId);
  }

  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  async validatePassword(username, password) {
    const user = this.findUserByUsername(username);
    if (!user) {
      return false;
    }

    return await bcrypt.compare(password, user.password);
  }

  async authenticate(username, password) {
    const user = this.findUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return { id: user.id, username: user.username, createdAt: user.createdAt, roles: user.roles || [], spaces: user.spaces };
  }

  getAllUsers() {
    return this.users.map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    }));
  }

  /**
   * Generate a new session token for a user
   * @param {string} userId - The user ID
   * @returns {string} - The session token
   */
  generateSessionToken(userId) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    this.sessions.set(sessionId, {
      userId,
      expiresAt
    });
    
    // Clean up expired sessions periodically
    this.cleanupExpiredSessions();
    
    return sessionId;
  }

  /**
   * Validate a session token and return the associated user
   * @param {string} sessionId - The session token
   * @returns {Object|null} - The user object or null if invalid
   */
  validateSessionToken(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    const user = this.findUserById(session.userId);
    if (!user) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      roles: user.roles || [],
      spaces: user.spaces
    };
  }

  /**
   * Invalidate a session token
   * @param {string} sessionId - The session token to invalidate
   */
  invalidateSessionToken(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Update user data
   * @param {string} userId - The user ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<boolean>} - Success status
   */
  async updateUser(userId, updateData) {
    const user = this.findUserById(userId);
    if (!user) {
      return false;
    }

    // Update user properties
    if (updateData.password) {
      const bcrypt = require('bcryptjs');
      const saltRounds = 10;
      user.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    if (updateData.spaces !== undefined) {
      user.spaces = updateData.spaces;
    }

    if (updateData.roles !== undefined) {
      user.roles = updateData.roles;
    }

    // Save to file
    await this.saveUsers();
    return true;
  }

  /**
   * Create a new API key for a user
   * @param {Object} keyData - API key data
   * @returns {boolean} - Success status
   */
  createApiKey(keyData) {
    try {
      this.apiKeys.push(keyData);
      this.saveApiKeys();
      return true;
    } catch (error) {
      console.error('Error creating API key:', error);
      return false;
    }
  }

  /**
   * Get all API keys for a user
   * @param {string} userId - The user ID
   * @returns {Array} - Array of API keys
   */
  getUserApiKeys(userId) {
    return this.apiKeys.filter(key => key.userId === userId && key.isActive);
  }

  /**
   * Get API key by ID
   * @param {string} keyId - The API key ID
   * @returns {Object|null} - The API key or null if not found
   */
  getApiKeyById(keyId) {
    return this.apiKeys.find(key => key.id === keyId && key.isActive);
  }

  /**
   * Get API key by the actual key value
   * @param {string} keyValue - The API key value
   * @returns {Object|null} - The API key or null if not found
   */
  getApiKeyByValue(keyValue) {
    return this.apiKeys.find(key => key.key === keyValue && key.isActive);
  }

  /**
   * Update API key last used timestamp
   * @param {string} keyValue - The API key value
   */
  updateApiKeyLastUsed(keyValue) {
    const apiKey = this.getApiKeyByValue(keyValue);
    if (apiKey) {
      apiKey.lastUsed = new Date().toISOString();
      this.saveApiKeys();
    }
  }

  /**
   * Revoke an API key
   * @param {string} keyId - The API key ID
   * @returns {boolean} - Success status
   */
  revokeApiKey(keyId) {
    try {
      const apiKey = this.getApiKeyById(keyId);
      if (apiKey) {
        apiKey.isActive = false;
        apiKey.revokedAt = new Date().toISOString();
        this.saveApiKeys();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error revoking API key:', error);
      return false;
    }
  }

  /**
   * Update API key metadata
   * @param {string} keyId - The API key ID
   * @param {Object} updateData - Data to update
   * @returns {boolean} - Success status
   */
  updateApiKey(keyId, updateData) {
    try {
      const apiKey = this.getApiKeyById(keyId);
      if (apiKey) {
        if (updateData.name !== undefined) {
          apiKey.name = updateData.name;
        }
        if (updateData.description !== undefined) {
          apiKey.description = updateData.description;
        }
        apiKey.updatedAt = new Date().toISOString();
        this.saveApiKeys();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating API key:', error);
      return false;
    }
  }

  /**
   * Authenticate user by API key
   * @param {string} keyValue - The API key value
   * @returns {Object|null} - The user object or null if invalid
   */
  authenticateByApiKey(keyValue) {
    const apiKey = this.getApiKeyByValue(keyValue);
    if (!apiKey) {
      return null;
    }

    const user = this.findUserById(apiKey.userId);
    if (!user) {
      return null;
    }

    // Update last used timestamp
    this.updateApiKeyLastUsed(keyValue);

    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      roles: user.roles || [],
      spaces: user.spaces,
      apiKeyId: apiKey.id
    };
  }

  /**
   * Validate user credentials (username and password)
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object|null>} - User object or null if invalid
   */
  async validateUser(username, password) {
    const user = this.findUserByUsername(username);
    if (!user || !user.password) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      roles: user.roles || [],
      spaces: user.spaces
    };
  }
}

module.exports = new UserStorage();