const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/**
 * Authentication middleware to protect routes
 */
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
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

module.exports = router;