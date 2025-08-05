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

class UserStorage {
  constructor() {
    this.users = [];
    this.sessions = new Map(); // In-memory session storage: sessionId -> { userId, expiresAt }
    this.loadUsersSync();
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
}

module.exports = new UserStorage();