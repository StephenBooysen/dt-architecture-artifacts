/**
 * @fileoverview Shared authentication middleware
 * 
 * Provides consistent authentication middleware across all routes
 * Supports session-based, token-based, and API key authentication
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2025-08-06
 */

const userStorage = require('./userStorage');

/**
 * Authentication middleware to protect routes
 * Supports session-based (cookies), token-based (Authorization header), and API key authentication
 */
function requireAuth(req, res, next) {
  // First, check if user is authenticated via session (for web clients)
  if (req.isAuthenticated()) {
    return next();
  }
  
  // If not authenticated via session, check for Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Try session token first (for VS Code extension)
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

module.exports = {
  requireAuth
};