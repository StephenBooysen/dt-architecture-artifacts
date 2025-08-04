/**
 * @fileoverview Authorisation for Architecture Artifacts application.
 * 
 * This server provides the current auth capability for the Architecture Artifacts application.
 * Currently we use a simple auth model. Google and Azure auth will be added
 * 
 * Key features:
 * - File and folder CRUD operations
 * - Git integration (commit, push, pull, clone, status)
 * - File upload with security validation
 * - API call monitoring and dashboard
 * - Security middleware (helmet, rate limiting)
 * - Path traversal protection
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */
const express = require('express');
const userStorage = require('../../auth/userStorage');
const passport = require('../../auth/passport');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/**
 * Authentication middleware to protect routes
 * Supports both session-based (cookies) and token-based (Authorization header) authentication
 */
function requireAuth(req, res, next) {
  // First, check if user is authenticated via session (for web clients)
  if (req.isAuthenticated()) {
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

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const user = await userStorage.createUser(username, password);
    res.json({ message: 'User created successfully', user });
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: 'User already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login user
router.post('/login', passport.authenticate('local'), (req, res) => {
  // Check if user has write role for client access
  if (req.user && req.user.roles && req.user.roles.includes('write')) {
    // Generate session token for clients that need it (like VS Code extension)
    const sessionToken = userStorage.generateSessionToken(req.user.id);
    
    res.json({ 
      message: 'Login successful', 
      user: req.user, 
      sessionToken: sessionToken // Include token for header-based authentication
    });
  } else {
    // Logout the user since they don't have proper permissions
    req.logout((err) => {
      if (err) {
        console.error('Error logging out user:', err);
      }
    });
    res.status(403).json({ error: 'Access denied: Write role required for client access' });
  }
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Use OAuth state parameter to track the source
  const source = req.query.source || 'client';
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: source
  })(req, res, next);
});

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
  (req, res) => {
    // Check if user has write role for client access
    if (req.user && req.user.roles && req.user.roles.includes('write')) {
      // Generate session token for clients that need it
      const sessionToken = userStorage.generateSessionToken(req.user.id);
      
      // Check if the login came from the server admin interface using OAuth state parameter
      const authSource = req.query.state || 'client';
      const isServerAdmin = authSource === 'server';
      
      if (isServerAdmin) {
        // Redirect to server dashboard
        res.redirect('/?auth=success');
      } else {
        // Redirect to client with success parameter
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${clientUrl}?auth=success&token=${sessionToken}`);
      }
    } else {
      // Logout the user since they don't have proper permissions
      req.logout((err) => {
        if (err) {
          console.error('Error logging out user:', err);
        }
      });
      
      // Check if the login came from the server admin interface using OAuth state parameter
      const authSource = req.query.state || 'client';
      const isServerAdmin = authSource === 'server';
      
      if (isServerAdmin) {
        res.redirect('/login?error=access_denied');
      } else {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${clientUrl}?auth=error&message=access_denied`);
      }
    }
  }
);

// Logout user
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Get current user info
router.get('/me', (req, res) => {
  // Check session-based auth first
  if (req.isAuthenticated()) {
    return res.json({ user: req.user });
  }
  
  // Check token-based auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = userStorage.validateSessionToken(token);
    
    if (user) {
      return res.json({ user: user });
    }
  }
  
  res.status(401).json({ error: 'Not authenticated' });
});

// Get all users (admin function)
router.get('/users', requireAuth, (req, res) => {
  try {
    const users = userStorage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user's allowed spaces (alternative auth endpoint for extensions)
router.get('/user-spaces', requireAuth, (req, res) => {
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

module.exports = router;