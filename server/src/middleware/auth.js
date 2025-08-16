/**
 * @fileoverview Authentication middleware for server administration.
 * Handles user authentication and authorization for admin routes.
 */

const session = require('express-session');

/**
 * Configure session middleware
 */
function configureSession(config) {
  return session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.SECURE_COOKIES,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  });
}

/**
 * Authentication middleware for server administration pages.
 * 
 * Verifies that the user is authenticated and has admin role privileges.
 * Redirects unauthenticated users to the landing page and blocks access
 * for non-admin users. Allows access to landing and login pages without auth.
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next middleware function
 * @returns {void}
 */
function requireServerAuth(req, res, next) {
  if (req.isAuthenticated()) {
    // Check if user has admin role
    if (req.user && req.user.roles && req.user.roles.includes('admin')) {
      return next();
    } else {
      return res.status(403).send('Access denied: Admin role required');
    }
  }
  // Check if it's the landing or login page - allow those
  if (req.path === '/server-landing' || req.path === '/server-login') {
    return next();
  }
  res.redirect('/server-landing');
}

/**
 * Helper function to check if user is authenticated
 */
function isAuthenticated(req) {
  return req.isAuthenticated && req.isAuthenticated();
}

/**
 * Helper function to check if user has admin role
 */
function isAdmin(req) {
  return isAuthenticated(req) && 
         req.user && 
         req.user.roles && 
         req.user.roles.includes('admin');
}

module.exports = {
  configureSession,
  requireServerAuth,
  isAuthenticated,
  isAdmin
};