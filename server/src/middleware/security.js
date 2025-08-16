/**
 * @fileoverview Security middleware configuration.
 * Handles helmet, CORS, rate limiting, and other security measures.
 */

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

/**
 * Configure helmet security middleware
 */
function configureHelmet() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com"
        ],
        fontSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com"
        ],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    }
  });
}

/**
 * Configure CORS middleware
 */
function configureCORS(allowedOrigins) {
  return cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check for exact matches first
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check for browser extension origins
      const extensionPrefixes = [
        'chrome-extension://',
        'moz-extension://',
        'ms-browser-extension://',
        'extension://',
        'safari-web-extension://'
      ];
      
      const isExtension = extensionPrefixes.some(prefix => origin.startsWith(prefix));
      if (isExtension) {
        console.log(`Allowing browser extension origin: ${origin}`);
        return callback(null, true);
      }
      
      // Check for wildcard patterns in allowed origins
      const isAllowedByPattern = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          // Convert wildcard pattern to regex
          const regexPattern = allowedOrigin
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(origin);
        }
        return false;
      });
      
      if (isAllowedByPattern) {
        return callback(null, true);
      }
      
      console.warn(`CORS blocked origin: ${origin}`);
      console.warn(`Allowed origins are:`, allowedOrigins);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true
  });
}

/**
 * Configure rate limiting middleware
 */
function configureRateLimit(windowMs, max) {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP, please try again later.',
    validate: {xForwardedForHeader: false}
  });
}

module.exports = {
  configureHelmet,
  configureCORS,
  configureRateLimit
};