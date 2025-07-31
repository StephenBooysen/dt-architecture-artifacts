/**
 * @fileoverview Express server for Architecture Artifacts application.
 * 
 * This server provides a REST API for managing markdown files, folders, and Git operations
 * in a content management system. It includes features for file upload, download, editing,
 * and comprehensive Git integration with monitoring capabilities.
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
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const EventEmitter = require('events');
const session = require('express-session');
const passport = require('./src/auth/passport');
const { renderComponent } = require('./src/utils/reactRenderer');
const apiRoutes = require('./src/routes/index');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;


/** @type {Array<Object>} Array to store API call logs for monitoring */
const apiCalls = [];

/** @const {number} Maximum number of API calls to keep in memory */
const MAX_API_CALLS = 1000;

// Make apiCalls available to routes
app.locals.apiCalls = apiCalls;

/**
 * Middleware to log API calls for monitoring purposes.
 * 
 * This middleware intercepts all API requests and responses to collect
 * performance and usage metrics. It captures request details, response
 * metadata, and timing information.
 * 
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object  
 * @param {express.NextFunction} next - Express next middleware function
 */
function logApiCall(req, res, next) {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override res.end to capture response details
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log the API call
    const apiCall = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      statusCode: res.statusCode,
      duration: duration,
      responseSize: chunk ? Buffer.byteLength(chunk) : 0,
      requestBody: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : null
    };
    
    // Add to beginning of array and trim if needed
    apiCalls.unshift(apiCall);
    if (apiCalls.length > MAX_API_CALLS) {
      apiCalls.pop();
    }
    
    // Keep app.locals in sync
    req.app.locals.apiCalls = apiCalls;
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

app.use(helmet({
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
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

/**
 * Patch our emitter to capture all events
 * @param {} emitter
 */
function patchEmitter(emitter) {
  const originalEmit = emitter.emit;

  emitter.emit = function () {
    const eventName = arguments[0];
    const args = Array.from(arguments).slice(1); // Get arguments excluding the event name

    console.log(`Caught event: "${eventName}" with arguments:`, args);

    // Call the original emit method to ensure normal event handling continues
    return originalEmit.apply(this, arguments);
  };
}
const eventEmitter = new EventEmitter();
patchEmitter(eventEmitter);

const log = require('./src/services/logging')('', { 'express-app': app }, eventEmitter);
const cacheing = require('./src/services/caching')('', { 'express-app': app }, eventEmitter);
const filing = require('./src/services/filing')('', { 'express-app': app }, eventEmitter);
const measuring = require('./src/services/measuring')('', { 'express-app': app }, eventEmitter);
const notifying = require('./src/services/notifying')('', { 'express-app': app }, eventEmitter);
const queueing = require('./src/services/queueing')('', { 'express-app': app }, eventEmitter);
const scheduling = require('./src/services/scheduling')('', { 'express-app': app }, eventEmitter);
const searching = require('./src/services/searching')('', { 'express-app': app }, eventEmitter);
const workflow = require('./src/services/workflow')('', { 'express-app': app }, eventEmitter);
const working = require('./src/services/working')('', { 'express-app': app }, eventEmitter);

// Apply API call logging to all API routes
app.use('/api', logApiCall);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
//app.use('/api/', limiter);

// Use API routes
app.use('/api', apiRoutes);




// Helper functions for server pages
function getSharedStyles() {
  return `
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css">
    <style>
    :root {
      --confluence-primary: #0052cc;
      --confluence-primary-hover: #0747a6;
      --confluence-secondary: #6b778c;
      --confluence-text: #172b4d;
      --confluence-text-subtle: #6b778c;
      --confluence-bg: #f7f8fa;
      --confluence-bg-card: #ffffff;
      --confluence-border: #e5e8ec;
      --confluence-border-subtle: #f4f5f7;
      --confluence-success: #36b37e;
      --confluence-danger: #de350b;
      --confluence-warning: #ffab00;
      --confluence-info: #0052cc;
    }

    /* Dark Theme */
    [data-theme="dark"] {
      --confluence-primary: #4c9aff;
      --confluence-primary-hover: #2684ff;
      --confluence-secondary: #8993a4;
      --confluence-text: #f4f5f7;
      --confluence-text-subtle: #b3bac5;
      --confluence-bg: #0d1117;
      --confluence-bg-card: #161b22;
      --confluence-border: #30363d;
      --confluence-border-subtle: #21262d;
      --confluence-success: #56d364;
      --confluence-danger: #f85149;
      --confluence-warning: #e3b341;
      --confluence-info: #4c9aff;
    }

    /* Bootstrap overrides for Confluence theme */
    .btn-primary {
      --bs-btn-bg: var(--confluence-primary);
      --bs-btn-border-color: var(--confluence-primary);
      --bs-btn-hover-bg: var(--confluence-primary-hover);
      --bs-btn-hover-border-color: var(--confluence-primary-hover);
      --bs-btn-active-bg: var(--confluence-primary-hover);
      --bs-btn-active-border-color: var(--confluence-primary-hover);
      font-weight: 500;
      border-radius: 4px;
    }

    .btn-secondary {
      --bs-btn-bg: #f4f5f7;
      --bs-btn-border-color: #dfe1e6;
      --bs-btn-color: var(--confluence-text);
      --bs-btn-hover-bg: #e4e6ea;
      --bs-btn-hover-border-color: #c1c7d0;
      --bs-btn-hover-color: var(--confluence-text);
      --bs-btn-active-bg: #e4e6ea;
      --bs-btn-active-border-color: #c1c7d0;
      font-weight: 500;
      border-radius: 4px;
    }

    /* Dark theme button overrides */
    [data-theme="dark"] .btn-primary {
      --bs-btn-bg: var(--confluence-bg-card);
      --bs-btn-border-color: var(--confluence-border);
      --bs-btn-color: var(--confluence-text);
      --bs-btn-hover-bg: var(--confluence-border-subtle);
      --bs-btn-hover-border-color: var(--confluence-border);
      --bs-btn-hover-color: var(--confluence-text);
      --bs-btn-active-bg: var(--confluence-border-subtle);
      --bs-btn-active-border-color: var(--confluence-border);
    }

    [data-theme="dark"] .btn-secondary {
      --bs-btn-bg: var(--confluence-bg-card);
      --bs-btn-border-color: var(--confluence-border);
      --bs-btn-color: var(--confluence-text);
      --bs-btn-hover-bg: var(--confluence-border-subtle);
      --bs-btn-hover-border-color: var(--confluence-border);
      --bs-btn-hover-color: var(--confluence-text);
      --bs-btn-active-bg: var(--confluence-border-subtle);
      --bs-btn-active-border-color: var(--confluence-border);
    }

    [data-theme="dark"] .btn-outline-secondary {
      --bs-btn-color: var(--confluence-text);
      --bs-btn-border-color: var(--confluence-border);
      --bs-btn-hover-bg: var(--confluence-border-subtle);
      --bs-btn-hover-border-color: var(--confluence-border);
      --bs-btn-hover-color: var(--confluence-text);
      --bs-btn-active-bg: var(--confluence-border-subtle);
      --bs-btn-active-border-color: var(--confluence-border);
    }

    .form-control, .form-select {
      border: 2px solid var(--confluence-border);
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .form-control:focus, .form-select:focus {
      border-color: var(--confluence-primary);
      box-shadow: 0 0 0 0.2rem rgba(0, 82, 204, 0.25);
    }

    .card {
      border: 1px solid var(--confluence-border);
      border-radius: 4px;
      box-shadow: 0 1px 2px rgba(9, 30, 66, 0.08);
    }

    .card-header {
      background-color: var(--confluence-bg-card);
      border-bottom: 1px solid var(--confluence-border);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      background-color: var(--confluence-bg);
      color: var(--confluence-text);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header styles */
    .app-header {
      background: var(--confluence-bg-card);
      border-bottom: 2px solid var(--confluence-border);
      box-shadow: 0 2px 8px rgba(0, 82, 204, 0.06);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .app-header .navbar-brand {
      color: var(--confluence-text) !important;
      font-size: 1.25rem;
      font-weight: 500;
      text-decoration: none;
    }

    .app-header .navbar-brand:hover {
      color: var(--confluence-text) !important;
    }

    /* Server status indicator styles */
    .server-status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: linear-gradient(135deg, #36b37e, #00875a);
      box-shadow: 0 0 8px rgba(54, 179, 126, 0.6);
      animation: pulse 2s infinite;
    }
    
    .server-status-indicator.offline {
      background: linear-gradient(135deg, #de350b, #bf2600);
      box-shadow: 0 0 8px rgba(222, 53, 11, 0.6);
    }
    
    .server-status-text {
      font-size: 0.875rem;
      font-weight: 500;
      color: #36b37e;
    }
    
    .server-status-text.offline {
      color: #de350b;
    }
    
    @keyframes pulse {
      0% {
        box-shadow: 0 0 8px rgba(54, 179, 126, 0.6);
      }
      50% {
        box-shadow: 0 0 16px rgba(54, 179, 126, 0.8);
      }
      100% {
        box-shadow: 0 0 8px rgba(54, 179, 126, 0.6);
      }
    }

    /* Main layout */
    .app-main {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .sidebar {
      background: var(--confluence-bg-card);
      border-right: 2px solid var(--confluence-border);
      display: flex;
      position: relative;
      min-width: 250px;
      max-width: 600px;
      width: 250px;
      transition: width 0.3s ease, min-width 0.3s ease, opacity 0.3s ease;
      overflow: hidden;
    }
    
    .sidebar.collapsed {
      width: 0;
      min-width: 0;
      opacity: 0;
      border-right: none;
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Editor section */
    .editor-section {
      flex: 1;
      background: var(--confluence-bg);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      padding: 2rem;
    }

    .sidebar-header {
      padding: 1rem;
      border-bottom: 1px solid var(--confluence-border);
      background: var(--confluence-bg-card);
    }

    .sidebar-header h2 {
      color: var(--confluence-text);
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }

    .sidebar-nav {
      padding: 1rem 0;
    }

    .nav-section {
      margin-bottom: 1.5rem;
    }

    .nav-section-title {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--confluence-text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .nav-item {
      display: block;
      padding: 0.75rem 1rem;
      color: var(--confluence-text);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 400;
      transition: all 0.2s ease;
      border-left: 3px solid transparent;
    }

    .nav-item:hover {
      background: var(--confluence-border-subtle);
      color: var(--confluence-primary);
      text-decoration: none;
    }

    .nav-item.active {
      background: #e6f3ff;
      color: var(--confluence-primary);
      font-weight: 500;
      border-left-color: var(--confluence-primary);
    }


    .content-header {
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .content-header h1 {
      color: var(--confluence-text);
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .content-header p {
      color: var(--confluence-text-subtle);
      font-size: 0.875rem;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: 1px solid #dfe1e6;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      background: #ffffff;
      color: #172b4d;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      line-height: 1;
    }

    .btn-primary {
      background: #0052cc;
      color: white;
      border-color: #0052cc;
    }

    .btn-primary:hover {
      background: #0747a6;
      border-color: #0747a6;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .btn-secondary:hover {
      background: #f4f5f7;
      border-color: #c1c7d0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }

    .settings-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .settings-card {
      padding: 2rem;
    }

    .settings-card h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .settings-description {
      color: #5e6c84;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }

    .settings-form {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e5e8ec;
    }

    .settings-form h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .settings-actions h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #172b4d;
      font-size: 0.875rem;
    }

    .form-group input {
      width: 100%;
      padding: 0.75rem;
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .form-group input:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
    }

    .form-group input::placeholder {
      color: #8993a4;
    }

    .dashboard-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .stat-card h3 {
      color: #0052cc;
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .stat-card p {
      color: #5e6c84;
      font-size: 0.875rem;
      font-weight: 400;
    }

    .api-calls-table {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      overflow-x: auto;
    }

    .api-calls-table h2 {
      color: #172b4d;
      margin-bottom: 1rem;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .controls {
      margin-bottom: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .controls label {
      color: #172b4d;
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .controls input, .controls select {
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid #dfe1e6;
      background: #ffffff;
      color: #172b4d;
      font-size: 0.875rem;
    }

    .table-container {
      overflow-x: auto;
      max-height: 60vh;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid #dfe1e6;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e8ec;
    }

    th {
      background: #f4f5f7;
      font-weight: 500;
      color: #172b4d;
      position: sticky;
      top: 0;
      font-size: 0.875rem;
    }

    tr:hover {
      background: #f4f5f7;
    }

    .method-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: white;
    }

    .method-get { background: #36b37e; }
    .method-post { background: #0052cc; }
    .method-put { background: #ff8b00; }
    .method-delete { background: #de350b; }
    .method-patch { background: #6554c0; }

    .status-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: white;
    }

    .status-2xx { background: #36b37e; }
    .status-3xx { background: #ff8b00; }
    .status-4xx { background: #ff991f; }
    .status-5xx { background: #de350b; }

    .duration {
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      font-size: 0.875rem;
    }

    .timestamp {
      font-size: 0.875rem;
      color: #5e6c84;
    }

    /* Footer */
    .app-footer {
      background: var(--confluence-bg-card);
      border-top: 1px solid var(--confluence-border);
      padding: 0.75rem 1.5rem;
      text-align: center;
      color: var(--confluence-text-subtle);
      font-size: 0.75rem;
    }

    /* Sidebar toggle functionality */
    .sidebar-toggle {
      padding: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
      border: 1px solid var(--confluence-border);
      background: var(--confluence-bg-card);
      transition: all 0.2s ease;
    }
    
    .sidebar-toggle:hover {
      background: var(--confluence-border-subtle);
      border-color: var(--confluence-primary);
    }
    
    .sidebar-toggle:active {
      transform: scale(0.95);
    }

    @media (max-width: 768px) {
      .app-header {
        padding: 0.5rem 1rem;
      }
      
      .app-header h1 {
        font-size: 1rem;
      }
      
      .sidebar {
        min-width: 200px;
        width: 200px;
      }
      
      .sidebar.collapsed {
        min-width: 0;
        width: 0;
      }
      
      .editor-section {
        padding: 0.75rem;
      }
      
      .dashboard-stats {
        grid-template-columns: 1fr;
      }
      
      table {
        font-size: 0.8rem;
      }
      
      th, td {
        padding: 0.5rem;
      }
    }
  </style>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>`;
}

function getHeader() {
  return `
    <header class="app-header">
      <nav class="navbar navbar-expand-lg">
        <div class="container-fluid">
          <div class="d-flex align-items-center w-100">
            <button
              class="btn btn-secondary btn-sm sidebar-toggle me-3"
              onclick="toggleSidebar()"
              title="Toggle sidebar"
            >
              <i class="bi bi-aspect-ratio" id="sidebar-toggle-icon"></i>
            </button>
            
            <a class="navbar-brand fw-medium me-3 d-flex align-items-center" href="/">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="me-2">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" stroke-width="2" stroke-linejoin="round"/>
                <path d="M12 22V12" stroke="#0052cc" stroke-width="2"/>
                <path d="M2 7L12 12L22 7" stroke="#0052cc" stroke-width="2"/>
              </svg>
              Architecture Artifacts Server
            </a>
            
            <div class="ms-auto d-flex align-items-center gap-3">
              <div class="d-flex align-items-center">
                <div class="server-status-indicator" id="server-status-indicator" title="Server Status"></div>
                <span class="server-status-text ms-2" id="server-status-text">Checking...</span>
              </div>
              <button
                class="btn btn-outline-secondary btn-sm"
                onclick="toggleTheme()"
                id="theme-toggle-btn"
                title="Switch theme"
              >
                <i class="bi bi-moon" id="theme-toggle-icon"></i>
              </button>
              <button class="btn btn-outline-secondary btn-sm" onclick="logout()" title="Logout">
                <i class="bi bi-box-arrow-right me-1"></i>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  `;
}

function getNavigation(activeSection) {
  return `
    <main class="app-main">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-content">
          <div class="sidebar-header">
            <h2><i class="bi bi-building me-2"></i>Navigation</h2>
          </div>
          <nav class="sidebar-nav">
            <div class="nav-section">
              <div class="nav-section-title">Overview</div>
              <a href="/" class="nav-item ${activeSection === 'overview' ? 'active' : ''}">
                <i class="bi bi-speedometer2 me-2"></i>Dashboard
              </a>
            </div>
            
            <div class="nav-section">
              <div class="nav-section-title">Settings</div>
              <a href="/settings" class="nav-item ${activeSection === 'settings' ? 'active' : ''}">
                <i class="bi bi-git me-2"></i>Git Repository
              </a>
            </div>
            
            <div class="nav-section">
              <div class="nav-section-title">Monitoring</div>
              <a href="/monitoring/api" class="nav-item ${activeSection === 'monitoring' ? 'active' : ''}">
                <i class="bi bi-graph-up me-2"></i>API Monitor
              </a>
              <a href="/test-apis" class="nav-item ${activeSection === 'test-apis' ? 'active' : ''}">
                <i class="bi bi-code-square me-2"></i>Test APIs
              </a>
            </div>

            <div class="nav-section">
              <div class="nav-section-title">Services</div>
              <a href="/services/logging" class="nav-item">
                <i class="bi bi-list-columns-reverse me-2"></i>Logging
              </a>
              <a href="/services/caching" class="nav-item">
                <i class="bi bi-database-check me-2"></i>Caching
              </a>
              <a href="/services/queueing" class="nav-item">
                <i class="bi bi-stack me-2"></i>Queueing
              </a>
              <a href="/services/measuring" class="nav-item">
                <i class="bi bi-speedometer2 me-2"></i>Measuring
              </a>
              <a href="/services/notifying" class="nav-item">
                <i class="bi bi-envelope-check me-2"></i>Notifying
              </a>
              <a href="/services/scheduling" class="nav-item">
                <i class="bi bi-clock-history me-2"></i>Scheduling
              </a>
              <a href="/services/searching" class="nav-item">
                <i class="bi bi-search me-2"></i>Searching
              </a>
              <a href="/services/workflow" class="nav-item">
                <i class="bi bi-bounding-box me-2"></i>Workflow
              </a>
              <a href="/services/working" class="nav-item">
                <i class="bi bi-gear-wide me-2"></i>Working
              </a>
            </div>

          </nav>
        </div>
      </aside>
      <section class="editor-section">
  `;
}

function getFooter() {
  return `
      </section>
    </main>

    <footer class="app-footer">
      <div class="container-fluid">
        <p class="mb-0 text-center small">© 2025 Architecture Artifacts Server - All rights reserved.</p>
      </div>
    </footer>
  `;
}

function getSidebarToggleScript() {
  return `
  <script>
    let sidebarCollapsed = false;
    
    function toggleSidebar() {
      console.log('Toggle sidebar clicked'); // Debug log
      const sidebar = document.getElementById('sidebar');
      const icon = document.getElementById('sidebar-toggle-icon');
      
      if (!sidebar) {
        console.error('Sidebar element not found');
        return;
      }
      
      if (!icon) {
        console.error('Sidebar toggle icon not found');
        return;
      }
      
      sidebarCollapsed = !sidebarCollapsed;
      console.log('Sidebar collapsed:', sidebarCollapsed); // Debug log
      
      if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        icon.className = 'bi bi-layout-sidebar';
      } else {
        sidebar.classList.remove('collapsed');
        icon.className = 'bi bi-aspect-ratio';
      }
    }
    
    // Ensure the function is available globally
    window.toggleSidebar = toggleSidebar;
    
    // Global logout function
    async function logout() {
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        
        if (response.ok) {          
          window.location.href = '/server-landing';
        } else {
          alert('Logout failed');
        }
      } catch (error) {
        alert('Network error during logout');
      }
    }
    
    // Global server status checking function
    async function checkServerStatus() {
      try {
        const response = await fetch('/api/server/status');
        const statusIndicator = document.getElementById('server-status-indicator');
        const statusText = document.getElementById('server-status-text');
        
        if (response.ok) {
          const data = await response.json();
          if (statusIndicator) {
            statusIndicator.classList.remove('offline');
            statusIndicator.title = \`Server Online - Uptime: \${Math.floor(data.uptime / 60)}m\`;
          }
          if (statusText) {
            statusText.classList.remove('offline');
            statusText.textContent = 'Server Online';
          }
        } else {
          throw new Error('Server status check failed');
        }
      } catch (error) {
        const statusIndicator = document.getElementById('server-status-indicator');
        const statusText = document.getElementById('server-status-text');
        if (statusIndicator) {
          statusIndicator.classList.add('offline');
          statusIndicator.title = 'Server Status Check Failed';
        }
        if (statusText) {
          statusText.classList.add('offline');
          statusText.textContent = 'Server Offline';
        }
      }
    }
    
    // Make functions globally available
    window.logout = logout;
    window.checkServerStatus = checkServerStatus;
    
    // Also add event listener approach as backup
    document.addEventListener('DOMContentLoaded', function() {
      const toggleBtn = document.querySelector('.sidebar-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
          e.preventDefault();
          toggleSidebar();
        });
      }
      
      // Initialize server status checking
      checkServerStatus();
      // Check status every 30 seconds
      setInterval(checkServerStatus, 30000);
    });
  </script>
  `;
}

function getThemeToggleScript() {
  return `
  <script>
    // Theme management
    function initTheme() {
      const savedTheme = localStorage.getItem('architecture-artifacts-theme');
      // Default to light theme regardless of system preference
      const theme = savedTheme || 'light';
      
      document.documentElement.setAttribute('data-theme', theme);
      updateThemeIcon(theme);
    }
    
    function toggleTheme() {
      console.log('Toggle theme clicked'); // Debug log
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('architecture-artifacts-theme', newTheme);
      updateThemeIcon(newTheme);
    }
    
    function updateThemeIcon(theme) {
      const icon = document.getElementById('theme-toggle-icon');
      if (icon) {
        if (theme === 'dark') {
          icon.className = 'bi bi-sun';
        } else {
          icon.className = 'bi bi-moon';
        }
      }
    }
    
    // Initialize theme on load
    document.addEventListener('DOMContentLoaded', function() {
      initTheme();
    });
    
    // Make function available globally
    window.toggleTheme = toggleTheme;
  </script>
  `;
}

function getMonitoringScript() {
  return `<script>
    let allCalls = [];
    let autoRefreshInterval;

    async function fetchApiCalls() {
      try {
        console.log('Fetching API calls...');
        const response = await fetch('/api-monitor-data');
        console.log('Response received:', response.status);
        const data = await response.json();
        console.log('Data received:', data.length, 'calls');
        allCalls = data;
        updateStats(data);
        filterCalls();
      } catch (error) {
        console.error('Failed to fetch API calls:', error);
        document.getElementById('stats').innerHTML = \`
          <div class="stat-card" style="background: rgba(231, 76, 60, 0.8);">
            <h3>Error</h3>
            <p>Failed to load API data</p>
          </div>
        \`;
      }
    }

    function updateStats(calls) {
      console.log('Updating stats with', calls.length, 'calls');
      const totalCalls = calls.length;
      const successCalls = calls.filter(c => c.statusCode >= 200 && c.statusCode < 300).length;
      const errorCalls = calls.filter(c => c.statusCode >= 400).length;
      const avgDuration = calls.length > 0 ? Math.round(calls.reduce((sum, c) => sum + c.duration, 0) / calls.length) : 0;

      const statsElement = document.getElementById('stats');
      if (!statsElement) {
        console.error('Stats element not found!');
        return;
      }
      
      statsElement.innerHTML = 
        '<div class="stat-card">' +
          '<h3>' + totalCalls + '</h3>' +
          '<p>Total API Calls</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<h3>' + successCalls + '</h3>' +
          '<p>Successful Calls</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<h3>' + errorCalls + '</h3>' +
          '<p>Error Calls</p>' +
        '</div>' +
        '<div class="stat-card">' +
          '<h3>' + avgDuration + 'ms</h3>' +
          '<p>Avg Duration</p>' +
        '</div>';
      
      console.log('Stats updated successfully');
    }

    function filterCalls() {
      const methodFilter = document.getElementById('methodFilter').value;
      const statusFilter = document.getElementById('statusFilter').value;

      let filteredCalls = allCalls;

      if (methodFilter) {
        filteredCalls = filteredCalls.filter(call => call.method === methodFilter);
      }

      if (statusFilter) {
        filteredCalls = filteredCalls.filter(call => {
          const statusClass = Math.floor(call.statusCode / 100);
          return statusClass.toString() === statusFilter;
        });
      }

      updateTable(filteredCalls);
    }

    function updateTable(calls) {
      console.log('Updating table with', calls.length, 'calls');
      const tbody = document.getElementById('tableBody');
      if (!tbody) {
        console.error('Table body element not found!');
        return;
      }
      
      if (calls.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #7f8c8d;">No API calls recorded yet. Make some API requests to see data here.</td></tr>';
        return;
      }
      
      const rows = calls.map(call => {
        return '<tr>' +
          '<td class="timestamp">' + formatTime(call.timestamp) + '</td>' +
          '<td><span class="method-badge method-' + call.method.toLowerCase() + '">' + call.method + '</span></td>' +
          '<td>' + call.url + '</td>' +
          '<td><span class="status-badge status-' + Math.floor(call.statusCode/100) + 'xx">' + call.statusCode + '</span></td>' +
          '<td class="duration">' + call.duration + 'ms</td>' +
          '<td>' + formatBytes(call.responseSize) + '</td>' +
          '<td>' + (call.ip || 'Unknown') + '</td>' +
        '</tr>';
      });
      
      tbody.innerHTML = rows.join('');
      console.log('Table updated successfully');
    }

    function formatTime(timestamp) {
      return new Date(timestamp).toLocaleString();
    }

    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function refreshData() {
      fetchApiCalls();
    }
    
    async function testApiCall() {
      console.log('Making test API call...');
      try {
        const response = await fetch('/api/files');
        console.log('Test API call completed:', response.status);
        setTimeout(() => fetchApiCalls(), 1000);
      } catch (error) {
        console.error('Test API call failed:', error);
      }
    }

    function toggleAutoRefresh() {
      const autoRefreshCheckbox = document.getElementById('autoRefresh');
      if (autoRefreshCheckbox.checked) {
        autoRefreshInterval = setInterval(fetchApiCalls, 5000);
      } else {
        clearInterval(autoRefreshInterval);
      }
    }

    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh();
    });
    
    if (document.readyState !== 'loading') {
      console.log('DOM already loaded, initializing API monitor...');
      fetchApiCalls();
      toggleAutoRefresh();
    }
  </script>`;
}

// Settings page with Git integration
app.get('/settings', requireServerAuth, (req, res) => {
  const html = renderComponent('settings', {
    activeSection: 'settings',
    title: 'Settings - Architecture Artifacts'
  });
  res.send(html);
});

// API monitoring page
app.get('/monitoring/api', requireServerAuth, (req, res) => {
  const html = renderComponent('apimonitor', {
    activeSection: 'monitoring',
    title: 'API Monitor - Architecture Artifacts'
  });
  res.send(html);
});

// Test APIs page with Swagger UI
app.get('/test-apis', requireServerAuth, (req, res) => {
  const html = renderComponent('swaggerui', {
    activeSection: 'test-apis',
    title: 'Test APIs - Architecture Artifacts'
  });
  res.send(html);
});

// Serve OpenAPI specification
app.get('/api-spec/swagger.json', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const swaggerPath = path.join(__dirname, 'src/openapi/swagger.json');
  
  try {
    const swaggerSpec = fs.readFileSync(swaggerPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  } catch (error) {
    console.error('Error serving OpenAPI specification:', error);
    res.status(500).json({ error: 'Failed to load API specification' });
  }
});

// Logging Service Page
app.get('/services/logging', requireServerAuth, (req, res) => {
  const html = renderComponent('logging', {
    activeSection: 'logging',
    title: 'Logging Service - Architecture Artifacts'
  });
  res.send(html);
});

// Caching Service Page
app.get('/services/caching', requireServerAuth, (req, res) => {
  const html = renderComponent('caching', {
    activeSection: 'caching',
    title: 'Caching Service - Architecture Artifacts'
  });
  res.send(html);
});

// Queueing Service Page
app.get('/services/queueing', requireServerAuth, (req, res) => {
  const html = renderComponent('queueing', {
    activeSection: 'queueing',
    title: 'Queueing Service - Architecture Artifacts'
  });
  res.send(html);
});
// Measuring Service Page
app.get('/services/measuring', requireServerAuth, (req, res) => {
  const html = renderComponent('measuring', {
    activeSection: 'measuring',
    title: 'Measuring Service - Architecture Artifacts'
  });
  res.send(html);
});
// Notifying Service Page
app.get('/services/notifying', requireServerAuth, (req, res) => {
  const html = renderComponent('notifying', {
    activeSection: 'notifying',
    title: 'Notifying Service - Architecture Artifacts'
  });
  res.send(html);
});
// Scheduling Service Page
app.get('/services/scheduling', requireServerAuth, (req, res) => {
  const html = renderComponent('scheduling', {
    activeSection: 'scheduling',
    title: 'Scheduling Service - Architecture Artifacts'
  });
  res.send(html);
});
// Working Service Page
app.get('/services/working', requireServerAuth, (req, res) => {
  const html = renderComponent('working', {
    activeSection: 'working',
    title: 'Working Service - Architecture Artifacts'
  });
  res.send(html);
});
// Workflow Service Page
app.get('/services/workflow', requireServerAuth, (req, res) => {
  const html = renderComponent('workflow', {
    activeSection: 'workflow',
    title: 'Workflow Service - Architecture Artifacts'
  });
  res.send(html);
});
// Search Service Page
app.get('/services/searching', requireServerAuth, (req, res) => {
  const html = renderComponent('searching', {
    activeSection: 'searching',
    title: 'Searching Service - Architecture Artifacts'
  });
  res.send(html);
});
// Authentication middleware for server pages
function requireServerAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  // Check if it's the landing or login page - allow those
  if (req.path === '/server-landing' || req.path === '/server-login') {
    return next();
  }
  res.redirect('/server-landing');
}

// Landing page with 5 second delay
app.get('/server-landing', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/server-dashboard');
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architecture Artifacts Server</title>
  ${getSharedStyles()}
</head>
<body>
  <div class="app">
    <div class="d-flex justify-content-center align-items-center" style="height: 100vh; background: var(--confluence-bg);">
      <div class="text-center" style="max-width: 400px; padding: 2rem;">
        <div class="mb-4">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="mb-4">
            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" stroke-width="2" stroke-linejoin="round"/>
            <path d="M12 22V12" stroke="#0052cc" stroke-width="2"/>
            <path d="M2 7L12 12L22 7" stroke="#0052cc" stroke-width="2"/>
          </svg>
        </div>
        <h1 class="text-confluence-text mb-3">Architecture Artifacts Server</h1>
        <p class="text-muted">Server administration and monitoring interface</p>
        <div class="mt-4">
          <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem;">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    setTimeout(function() {
      window.location.href = '/server-login';
    }, 5000);
  </script>
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// Server login page
app.get('/server-login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/server-dashboard');
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server Login - Architecture Artifacts</title>
  ${getSharedStyles()}
  <style>
    /* Server Auth Modal Styles - Match client login appearance */
    .server-auth-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .server-auth-modal {
      background: var(--confluence-bg-card);
      border: 1px solid var(--confluence-border);
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 420px;
      margin: 1rem;
      position: relative;
      animation: slideIn 0.3s ease-out;
    }

    .server-auth-content {
      padding: 2rem;
    }

    .server-auth-title {
      color: var(--confluence-text);
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .server-auth-subtitle {
      color: var(--confluence-text-subtle);
      font-size: 0.9rem;
      margin-bottom: 0;
    }

    .server-auth-form {
      margin-top: 1.5rem;
    }

    /* Bootstrap overrides for consistency */
    .server-auth-modal .form-label {
      color: var(--confluence-text);
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .server-auth-modal .form-control {
      background-color: var(--confluence-bg-card);
      border: 1px solid var(--confluence-border);
      color: var(--confluence-text);
      font-size: 1rem;
      padding: 0.75rem;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .server-auth-modal .form-control:focus {
      border-color: var(--confluence-primary);
      box-shadow: 0 0 0 0.2rem rgba(0, 82, 204, 0.25);
      background-color: var(--confluence-bg-card);
    }

    .server-auth-modal .form-control:disabled {
      background-color: var(--confluence-border);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .server-auth-modal .btn-primary {
      background-color: var(--confluence-primary);
      border-color: var(--confluence-primary);
      font-weight: 600;
      padding: 0.75rem;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .server-auth-modal .btn-primary:hover:not(:disabled) {
      background-color: var(--confluence-primary-hover);
      border-color: var(--confluence-primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 82, 204, 0.3);
    }

    .server-auth-modal .btn-primary:disabled {
      background-color: var(--confluence-primary);
      border-color: var(--confluence-primary);
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .server-auth-modal .alert-danger {
      background-color: rgba(222, 53, 11, 0.1);
      border-color: rgba(222, 53, 11, 0.2);
      color: var(--confluence-danger);
      border-radius: 6px;
      font-size: 0.9rem;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 480px) {
      .server-auth-modal {
        margin: 0.5rem;
        max-width: 100%;
        border-radius: 8px;
      }
      
      .server-auth-content {
        padding: 1.5rem;
      }
      
      .server-auth-title {
        font-size: 1.25rem;
      }
    }
  </style>
</head>
<body>
  <div class="server-auth-overlay">
    <div class="server-auth-modal">
      <div class="server-auth-content">
        <div class="text-center mb-4">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="mb-3">
            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" stroke-width="2" stroke-linejoin="round"/>
            <path d="M12 22V12" stroke="#0052cc" stroke-width="2"/>
            <path d="M2 7L12 12L22 7" stroke="#0052cc" stroke-width="2"/>
          </svg>
          <h2 class="server-auth-title">Server Administration</h2>
          <p class="server-auth-subtitle">Please sign in to access the server interface.</p>
        </div>
        
        <form id="loginForm" class="server-auth-form">
          <div id="error-message" class="alert alert-danger d-none"></div>
          
          <div class="mb-3">
            <label for="username" class="form-label">Username</label>
            <input
              type="text"
              class="form-control"
              id="username"
              name="username"
              required
              autofocus
            />
          </div>
          
          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <input
              type="password"
              class="form-control"
              id="password"
              name="password"
              required
            />
          </div>
          
          <button type="submit" class="btn btn-primary w-100" id="loginBtn">
            <span class="login-text">Sign In</span>
            <span class="login-spinner spinner-border spinner-border-sm d-none" role="status"></span>
          </button>
        </form>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const loginBtn = document.getElementById('loginBtn');
      const loginText = loginBtn.querySelector('.login-text');
      const loginSpinner = loginBtn.querySelector('.login-spinner');
      const errorMessage = document.getElementById('error-message');
      
      // Show loading state
      loginBtn.disabled = true;
      loginText.textContent = 'Signing In...';
      loginSpinner.classList.remove('d-none');
      errorMessage.classList.add('d-none');
      
      try {
        const formData = new FormData(e.target);
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            username: formData.get('username'),
            password: formData.get('password')
          }),
        });

        const data = await response.json();

        if (response.ok) {
          window.location.href = '/server-dashboard';
        } else {
          errorMessage.textContent = data.error || 'Login failed';
          errorMessage.classList.remove('d-none');
        }
      } catch (error) {
        errorMessage.textContent = 'Network error. Please try again.';
        errorMessage.classList.remove('d-none');
      } finally {
        // Reset loading state
        loginBtn.disabled = false;
        loginText.textContent = 'Sign In';
        loginSpinner.classList.add('d-none');
      }
    });
  </script>
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// Server dashboard (protected)
app.get('/server-dashboard', requireServerAuth, (req, res) => {
  const html = renderComponent('dashboard', {
    activeSection: 'overview',
    title: 'Server Dashboard - Architecture Artifacts',
    user: req.user
  });
  res.send(html);
});

// Backend index page with navigation overview
app.get('/', (req, res) => {
  // Check if user is authenticated, if so redirect to server dashboard
  if (req.isAuthenticated()) {
    return res.redirect('/server-dashboard');
  }
  
  // For unauthenticated users, redirect to landing page
  res.redirect('/server-landing');
});

// Test React rendering - Simple version
app.get('/test-react', (req, res) => {
  try {
    // Test without using the renderComponent function first
    const React = require('react');
    const { renderToString } = require('react-dom/server');
    
    const element = React.createElement('div', null, 'Hello from React SSR!');
    const html = renderToString(element);
    
    res.send(`<!DOCTYPE html><html><body>${html}</body></html>`);
  } catch (error) {
    console.error('React rendering error:', error);
    res.status(500).send(`React rendering error: ${error.message}`);
  }
});

// API endpoint to get monitoring data
app.get('/api-monitor-data', (req, res) => {
  res.json(apiCalls);
});

// Note: Static file serving is disabled to allow server-side routing
// If you need to serve the React client in production, uncomment below:
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../client/build')));
//   
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../client/build/index.html'));
//   });
// }

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
