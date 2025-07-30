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
        "https://cdn.jsdelivr.net"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net"
      ],
      fontSrc: [
        "'self'",
        "https://cdn.jsdelivr.net"
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
app.use('/api/', limiter);

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
            
            <div class="ms-auto d-flex align-items-center gap-2">
              <span class="badge bg-success">Server Running</span>
              <button
                class="btn btn-outline-secondary btn-sm"
                onclick="toggleTheme()"
                id="theme-toggle-btn"
                title="Switch theme"
              >
                <i class="bi bi-moon" id="theme-toggle-icon"></i>
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
    
    // Also add event listener approach as backup
    document.addEventListener('DOMContentLoaded', function() {
      const toggleBtn = document.querySelector('.sidebar-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
          e.preventDefault();
          toggleSidebar();
        });
      }
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
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings - Architecture Artifacts</title>
  ${getSharedStyles()}
</head>
<body>
  <div class="app">
    ${getHeader()}
    ${getNavigation('settings')}
        <div class="content-header">
          <h1>Settings</h1>
          <p>Configure your repository and system settings</p>
        </div>
        
        <div class="settings-section">
          <div class="settings-card">
            <h2>Git Repository</h2>
            <p class="settings-description">Manage your Git repository connection and operations</p>
            
            <form id="cloneForm" class="settings-form">
              <h3>Clone Repository</h3>
              <div class="form-group">
                <label for="repo-url">Repository URL:</label>
                <input
                  id="repo-url"
                  type="url"
                  placeholder="https://github.com/username/repository.git"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="branch">Branch:</label>
                <input
                  id="branch"
                  type="text"
                  value="main"
                  placeholder="main"
                />
              </div>
              
              <button type="submit" class="btn btn-primary">
                Clone Repository
              </button>
            </form>

            <div class="settings-actions">
              <h3>Repository Actions</h3>
              <button id="pullBtn" class="btn btn-secondary">
                Pull Latest Changes
              </button>
            </div>
          </div>
        </div>
    ${getFooter()}
  </div>

  <script>
    document.getElementById('cloneForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const repoUrl = document.getElementById('repo-url').value;
      const branch = document.getElementById('branch').value;
      
      try {
        const response = await fetch('/api/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl, branch })
        });
        
        if (response.ok) {
          alert('Repository cloned successfully');
          document.getElementById('repo-url').value = '';
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });

    document.getElementById('pullBtn').addEventListener('click', async () => {
      try {
        const response = await fetch('/api/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch: 'main' })
        });
        
        if (response.ok) {
          alert('Repository updated successfully');
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });
  </script>
  ${getSidebarToggleScript()}
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// API monitoring page
app.get('/monitoring/api', requireServerAuth, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Monitor - Architecture Artifacts</title>
  ${getSharedStyles()}
</head>
<body>
  <div class="app">
    ${getHeader()}
    ${getNavigation('monitoring')}
        <div class="content-header">
          <h1>API Monitor</h1>
          <p>Monitor API calls and system performance</p>
          <div class="header-actions">
            <button class="btn btn-secondary" onclick="refreshData()">Refresh</button>
            <button class="btn btn-secondary" onclick="testApiCall()">Test API</button>
          </div>
        </div>

        <div class="dashboard-stats" id="stats">
          <!-- Stats will be populated by JavaScript -->
        </div>

        <div class="api-calls-table">
          <h2>Recent API Calls</h2>
          <div class="controls">
            <label>
              Auto-refresh:
              <input type="checkbox" id="autoRefresh" onchange="toggleAutoRefresh()" checked>
            </label>
            <label>
              Filter by method:
              <select id="methodFilter" onchange="filterCalls()">
                <option value="">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </label>
            <label>
              Filter by status:
              <select id="statusFilter" onchange="filterCalls()">
                <option value="">All Status</option>
                <option value="2">2xx Success</option>
                <option value="3">3xx Redirect</option>
                <option value="4">4xx Client Error</option>
                <option value="5">5xx Server Error</option>
              </select>
            </label>
          </div>
          <div class="table-container">
            <table id="apiCallsTable">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Size</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody id="tableBody">
                <!-- API calls will be populated by JavaScript -->
              </tbody>
            </table>
          </div>
        </div>
    ${getFooter()}
  </div>

  ${getMonitoringScript()}
  ${getSidebarToggleScript()}
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// Logging Service Page
app.get('/services/logging', requireServerAuth, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logging Service - Architecture Artifacts</title>
  ${getSharedStyles()}
  <style>
    .logging-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      margin-bottom: 2rem;
    }
    .logging-form {
      padding: 2rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .logging-form h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #172b4d;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      background: #ffffff;
      color: #172b4d;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
    }
    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }
    .content-header h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .status-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
    .status-online {
      background-color: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.3);
    }
    .status-offline {
      background-color: #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.3);
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .recent-logs {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      margin-top: 2rem;
    }
    .recent-logs h3 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0;
      padding: 1.5rem 2rem 1rem 2rem;
    }
    .logs-table {
      width: 100%;
      border-collapse: collapse;
    }
    .logs-table th {
      background: #f8f9fa;
      border-bottom: 1px solid #dfe1e6;
      padding: 0.75rem 1rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: #172b4d;
      text-align: left;
    }
    .logs-table td {
      border-bottom: 1px solid #f1f2f4;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      color: #172b4d;
    }
    .logs-table tbody tr:hover {
      background: #f8f9fa;
    }
    .log-name-cell {
      color: #0052cc;
      font-weight: 500;
    }
    .log-time-cell {
      color: #5e6c84;
      font-size: 0.8rem;
      white-space: nowrap;
    }
    .log-message-cell {
      max-width: 300px;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="app">
    ${getHeader()}
    ${getNavigation('services')}
        <div class="content-header">
          <h1>
            <div class="status-dot status-offline" id="statusDot"></div>
            Logging Service
          </h1>
          <p>Interact with the application logging service</p>
        </div>

        <div class="logging-section">
          <div class="logging-form">
            <h2>Log Message</h2>
            <form id="loggingForm">
              <div class="form-group">
                <label for="logName">Log Name (optional):</label>
                <input type="text" id="logName" name="name" class="form-control" placeholder="Enter log name..." />
              </div>
              
              <div class="form-group">
                <label for="logMessage">Message:</label>
                <textarea id="logMessage" name="message" class="form-control" placeholder="Enter your log message..." required></textarea>
              </div>
              
              <button type="submit" class="btn btn-primary" id="logButton">
                <i class="bi bi-journal-plus me-2"></i>Log Message
              </button>
            </form>
          </div>
        </div>

        <div class="recent-logs" id="recentLogs" style="display: none;">
          <h3>Recent Logs</h3>
          <table class="logs-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Message</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody id="logsList">
            </tbody>
          </table>
        </div>

  <!-- Toast container for Bootstrap notifications -->
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
    <div id="logToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <svg class="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
        <strong class="me-auto" id="toastTitle">Logging Service</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body" id="toastMessage">
        <!-- Toast message will be inserted here -->
      </div>
    </div>
  </div>

    ${getFooter()}
  </div>

  <script>
    let recentLogs = [];

    // Check service status on page load
    async function checkServiceStatus() {
      try {
        const response = await fetch('/api/logging/status');
        if (response.ok) {
          document.getElementById('statusDot').className = 'status-dot status-online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        document.getElementById('statusDot').className = 'status-dot status-offline';
      }
    }

    // Handle form submission
    document.getElementById('loggingForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const logButton = document.getElementById('logButton');
      const logResult = document.getElementById('logResult');
      
      // Get form values
      const name = formData.get('name') || 'user-log';
      const message = formData.get('message');
      
      if (!message.trim()) {
        showToast('Please enter a message to log.', 'error');
        return;
      }
      
      // Disable button and show loading
      logButton.disabled = true;
      logButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Logging...';
      
      try {
        const response = await fetch('/api/logging/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name,
            message: message,
            time: new Date().toISOString()
          })
        });
        
        if (response.ok) {
          showToast('Message logged successfully!', 'success');
          
          // Add to recent logs
          const logEntry = {
            name: name,
            message: message,
            time: new Date().toISOString()
          };
          recentLogs.unshift(logEntry);
          recentLogs = recentLogs.slice(0, 10); // Keep only last 10 logs
          updateRecentLogs();
          
          // Clear form
          document.getElementById('logMessage').value = '';
          document.getElementById('logName').value = '';
        } else {
          throw new Error('Failed to log message');
        }
      } catch (error) {
        showToast('Failed to log message. Please try again.', 'error');
        console.error('Logging error:', error);
      } finally {
        // Re-enable button
        logButton.disabled = false;
        logButton.innerHTML = '<i class="bi bi-journal-plus me-2"></i>Log Message';
      }
    });

    function showToast(message, type) {
      const toast = document.getElementById('logToast');
      const toastBody = document.getElementById('toastMessage');
      const toastTitle = document.getElementById('toastTitle');
      const toastHeader = toast.querySelector('.toast-header');
      
      // Set message
      toastBody.textContent = message;
      
      // Set title and styling based on type
      if (type === 'success') {
        toastTitle.textContent = 'Success';
        toastHeader.classList.remove('bg-danger', 'text-white');
        toastHeader.classList.add('bg-success', 'text-white');
        toast.querySelector('svg rect').setAttribute('fill', '#198754');
      } else {
        toastTitle.textContent = 'Error';
        toastHeader.classList.remove('bg-success', 'text-white');
        toastHeader.classList.add('bg-danger', 'text-white');
        toast.querySelector('svg rect').setAttribute('fill', '#dc3545');
      }
      
      // Show toast
      const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
      });
      bsToast.show();
    }

    function updateRecentLogs() {
      const recentLogsContainer = document.getElementById('recentLogs');
      const logsList = document.getElementById('logsList');
      
      if (recentLogs.length > 0) {
        recentLogsContainer.style.display = 'block';
        logsList.innerHTML = recentLogs.map(log => \`
          <tr>
            <td class="log-name-cell">\${log.name}</td>
            <td class="log-message-cell">\${log.message}</td>
            <td class="log-time-cell">\${new Date(log.time).toLocaleString()}</td>
          </tr>
        \`).join('');
      }
    }

    // Check status periodically
    checkServiceStatus();
    setInterval(checkServiceStatus, 30000); // Check every 30 seconds
  </script>

  ${getSidebarToggleScript()}
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// Caching Service Page
app.get('/services/caching', requireServerAuth, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Caching Service - Architecture Artifacts</title>
  ${getSharedStyles()}
  <style>
    .caching-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      margin-bottom: 2rem;
    }
    .caching-form {
      padding: 2rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .caching-form h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #172b4d;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      background: #ffffff;
      color: #172b4d;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
    }
    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }
    .content-header h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .status-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
    .status-online {
      background-color: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.3);
    }
    .status-offline {
      background-color: #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.3);
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .cache-operations {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }
    .cache-result {
      background: #f8f9fa;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 2rem;
      min-height: 120px;
    }
    .cache-result h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .cache-result pre {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      padding: 1rem;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.875rem;
      color: #172b4d;
      max-height: 200px;
      overflow-y: auto;
    }
    @media (max-width: 768px) {
      .cache-operations {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    ${getHeader()}
    ${getNavigation('services')}
        <div class="content-header">
          <h1>
            <div class="status-dot status-offline" id="statusDot"></div>
            Caching Service
          </h1>
          <p>Interact with the application caching service</p>
        </div>

        <div class="caching-section">
          <div class="caching-form">
            <h2>Cache Operations</h2>
            
            <div class="form-group">
              <label for="cacheKey">Cache Key:</label>
              <input type="text" id="cacheKey" class="form-control" placeholder="Enter cache key..." required />
            </div>
            
            <div class="form-group">
              <label for="cacheValue">Cache Value (for PUT operation):</label>
              <textarea id="cacheValue" class="form-control" placeholder="Enter value to cache..."></textarea>
            </div>
            
            <div class="cache-operations">
              <button type="button" class="btn btn-success" id="putButton">
                <i class="bi bi-plus-circle me-2"></i>PUT
              </button>
              <button type="button" class="btn btn-primary" id="getButton">
                <i class="bi bi-search me-2"></i>GET
              </button>
              <button type="button" class="btn btn-danger" id="deleteButton">
                <i class="bi bi-trash me-2"></i>DELETE
              </button>
            </div>
          </div>
        </div>

        <div class="cache-result" id="cacheResult" style="display: none;">
          <h3>Result</h3>
          <pre id="resultContent"></pre>
        </div>

  <!-- Toast container for Bootstrap notifications -->
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
    <div id="cacheToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <svg class="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
        <strong class="me-auto" id="toastTitle">Caching Service</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body" id="toastMessage">
        <!-- Toast message will be inserted here -->
      </div>
    </div>
  </div>

    ${getFooter()}
  </div>

  <script>
    // Check service status on page load
    async function checkServiceStatus() {
      try {
        const response = await fetch('/api/caching/status');
        if (response.ok) {
          document.getElementById('statusDot').className = 'status-dot status-online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        document.getElementById('statusDot').className = 'status-dot status-offline';
      }
    }

    // Show toast notification
    function showToast(message, isError = false) {
      const toast = new bootstrap.Toast(document.getElementById('cacheToast'));
      document.getElementById('toastMessage').textContent = message;
      document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
      toast.show();
    }

    // Show result in result panel
    function showResult(content, title = 'Result') {
      const resultPanel = document.getElementById('cacheResult');
      const resultContent = document.getElementById('resultContent');
      
      resultContent.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
      resultPanel.style.display = 'block';
      
      // Scroll to result
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // PUT operation
    document.getElementById('putButton').addEventListener('click', async function() {
      const key = document.getElementById('cacheKey').value.trim();
      const value = document.getElementById('cacheValue').value.trim();
      
      if (!key) {
        showToast('Please enter a cache key', true);
        return;
      }
      
      if (!value) {
        showToast('Please enter a value to cache', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Putting...';
        
        const response = await fetch(\`/api/caching/put/\${encodeURIComponent(key)}\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(value)
        });
        
        if (response.ok) {
          const result = await response.text();
          showToast('Value cached successfully');
          showResult(\`Key "\${key}" cached successfully\`);
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to cache value: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-plus-circle me-2"></i>PUT';
      }
    });

    // GET operation
    document.getElementById('getButton').addEventListener('click', async function() {
      const key = document.getElementById('cacheKey').value.trim();
      
      if (!key) {
        showToast('Please enter a cache key', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Getting...';
        
        const response = await fetch(\`/api/caching/get/\${encodeURIComponent(key)}\`);
        
        if (response.ok) {
          const result = await response.json();
          showToast('Value retrieved successfully');
          showResult(result !== null ? result : 'Key not found or value is null');
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to get value: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-search me-2"></i>GET';
      }
    });

    // DELETE operation
    document.getElementById('deleteButton').addEventListener('click', async function() {
      const key = document.getElementById('cacheKey').value.trim();
      
      if (!key) {
        showToast('Please enter a cache key', true);
        return;
      }
      
      if (!confirm(\`Are you sure you want to delete the cache entry for key "\${key}"?\`)) {
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Deleting...';
        
        const response = await fetch(\`/api/caching/delete/\${encodeURIComponent(key)}\`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const result = await response.text();
          showToast('Value deleted successfully');
          showResult(\`Key "\${key}" deleted successfully\`);
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to delete value: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-trash me-2"></i>DELETE';
      }
    });

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      // Check status periodically
      checkServiceStatus();
      setInterval(checkServiceStatus, 30000); // Check every 30 seconds
    });
  </script>

  ${getSidebarToggleScript()}
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// Queueing Service Page
app.get('/services/queueing', requireServerAuth, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Queueing Service - Architecture Artifacts</title>
  ${getSharedStyles()}
  <style>
    .queueing-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      margin-bottom: 2rem;
    }
    .queueing-form {
      padding: 2rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .queueing-form h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #172b4d;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      background: #ffffff;
      color: #172b4d;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
    }
    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }
    .content-header h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .status-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
    .status-online {
      background-color: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.3);
    }
    .status-offline {
      background-color: #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.3);
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .queue-operations {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }
    .queue-stats {
      background: #f8f9fa;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 2rem;
      text-align: center;
    }
    .queue-stats h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .queue-size {
      font-size: 2rem;
      font-weight: bold;
      color: #0052cc;
    }
    .queue-result {
      background: #f8f9fa;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 2rem;
      min-height: 120px;
    }
    .queue-result h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .queue-result pre {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      padding: 1rem;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.875rem;
      color: #172b4d;
      max-height: 200px;
      overflow-y: auto;
    }
    .section-divider {
      border-top: 1px solid #dfe1e6;
      margin: 2rem 0;
      padding-top: 2rem;
    }
    @media (max-width: 768px) {
      .queue-operations {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    ${getHeader()}
    ${getNavigation('services')}
        <div class="content-header">
          <h1>
            <div class="status-dot status-offline" id="statusDot"></div>
            Queueing Service
          </h1>
          <p>Manage task queues with enqueue and dequeue operations</p>
        </div>

        <!-- Queue Statistics -->
        <div class="queue-stats">
          <h3>Current Queue Size</h3>
          <div class="queue-size" id="queueSize">-</div>
        </div>

        <!-- Enqueue Section -->
        <div class="queueing-section">
          <div class="queueing-form">
            <h2>Enqueue Task</h2>
            
            <div class="form-group">
              <label for="queueName">Queue Name:</label>
              <input type="text" id="queueName" class="form-control" placeholder="Enter queue name..." value="default" />
            </div>
            
            <div class="form-group">
              <label for="taskData">Task Data:</label>
              <textarea id="taskData" class="form-control" placeholder="Enter task data (JSON or text)..." required></textarea>
            </div>
            
            <button type="button" class="btn btn-success" id="enqueueButton">
              <i class="bi bi-plus-circle me-2"></i>Enqueue Task
            </button>
          </div>
        </div>

        <!-- Dequeue Section -->
        <div class="queueing-section">
          <div class="queueing-form section-divider">
            <h2>Dequeue Task</h2>
            
            <div class="form-group">
              <label for="dequeueQueueName">Queue Name:</label>
              <input type="text" id="dequeueQueueName" class="form-control" placeholder="Enter queue name..." value="default" />
            </div>
            
            <div class="queue-operations">
              <button type="button" class="btn btn-primary" id="dequeueButton">
                <i class="bi bi-arrow-down-circle me-2"></i>Dequeue Task
              </button>
              <button type="button" class="btn btn-info" id="refreshSizeButton">
                <i class="bi bi-arrow-clockwise me-2"></i>Refresh Size
              </button>
            </div>
          </div>
        </div>

        <div class="queue-result" id="queueResult" style="display: none;">
          <h3>Result</h3>
          <pre id="resultContent"></pre>
        </div>

  <!-- Toast container for Bootstrap notifications -->
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
    <div id="queueToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <svg class="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
        <strong class="me-auto" id="toastTitle">Queueing Service</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body" id="toastMessage">
        <!-- Toast message will be inserted here -->
      </div>
    </div>
  </div>

    ${getFooter()}
  </div>

  <script>
    // Check service status on page load
    async function checkServiceStatus() {
      try {
        const response = await fetch('/api/queueing/status');
        if (response.ok) {
          document.getElementById('statusDot').className = 'status-dot status-online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        document.getElementById('statusDot').className = 'status-dot status-offline';
      }
    }

    // Update queue size display
    async function updateQueueSize() {
      try {
        const response = await fetch('/api/queueing/size');
        if (response.ok) {
          const size = await response.json();
          document.getElementById('queueSize').textContent = size;
        } else {
          document.getElementById('queueSize').textContent = 'Error';
        }
      } catch (error) {
        document.getElementById('queueSize').textContent = 'Error';
      }
    }

    // Show toast notification
    function showToast(message, isError = false) {
      const toast = new bootstrap.Toast(document.getElementById('queueToast'));
      document.getElementById('toastMessage').textContent = message;
      document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
      toast.show();
    }

    // Show result in result panel
    function showResult(content, title = 'Result') {
      const resultPanel = document.getElementById('queueResult');
      const resultContent = document.getElementById('resultContent');
      
      resultContent.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
      resultPanel.style.display = 'block';
      
      // Scroll to result
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Enqueue operation
    document.getElementById('enqueueButton').addEventListener('click', async function() {
      const queueName = document.getElementById('queueName').value.trim();
      const taskData = document.getElementById('taskData').value.trim();
      
      if (!queueName) {
        showToast('Please enter a queue name', true);
        return;
      }
      
      if (!taskData) {
        showToast('Please enter task data', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Enqueuing...';
        
        // Try to parse as JSON, fallback to string if not valid JSON
        let task;
        try {
          task = JSON.parse(taskData);
        } catch (e) {
          task = taskData;
        }
        
        const response = await fetch('/api/queueing/enqueue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ task: task })
        });
        
        if (response.ok) {
          const result = await response.text();
          showToast('Task enqueued successfully');
          showResult(\`Task enqueued to queue "\${queueName}" successfully\`);
          
          // Clear the task data field
          document.getElementById('taskData').value = '';
          
          // Update queue size
          updateQueueSize();
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to enqueue task: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Enqueue Task';
      }
    });

    // Dequeue operation
    document.getElementById('dequeueButton').addEventListener('click', async function() {
      const queueName = document.getElementById('dequeueQueueName').value.trim();
      
      if (!queueName) {
        showToast('Please enter a queue name', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Dequeuing...';
        
        const response = await fetch('/api/queueing/dequeue');
        
        if (response.ok) {
          const task = await response.json();
          if (task !== null && task !== undefined) {
            showToast('Task dequeued successfully');
            showResult(task, 'Dequeued Task');
          } else {
            showToast('Queue is empty', false);
            showResult('No tasks in queue');
          }
          
          // Update queue size
          updateQueueSize();
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to dequeue task: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-arrow-down-circle me-2"></i>Dequeue Task';
      }
    });

    // Refresh size operation
    document.getElementById('refreshSizeButton').addEventListener('click', async function() {
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Refreshing...';
        
        await updateQueueSize();
        showToast('Queue size refreshed');
      } catch (error) {
        showToast('Failed to refresh queue size', true);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Refresh Size';
      }
    });

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      // Check status and update size periodically
      checkServiceStatus();
      updateQueueSize();
      
      setInterval(() => {
        checkServiceStatus();
        updateQueueSize();
      }, 30000); // Check every 30 seconds
    });
  </script>

  ${getSidebarToggleScript()}
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// Measuring Service Page
app.get('/services/measuring', requireServerAuth, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Measuring Service - Architecture Artifacts</title>
  ${getSharedStyles()}
  <style>
    .measuring-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      margin-bottom: 2rem;
    }
    .measuring-form {
      padding: 2rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .measuring-form h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #172b4d;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      background: #ffffff;
      color: #172b4d;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
    }
    .content-header h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .status-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
    .status-online {
      background-color: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.3);
    }
    .status-offline {
      background-color: #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.3);
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .date-range-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .query-operations {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }
    .metrics-result {
      background: #f8f9fa;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 2rem;
      min-height: 120px;
    }
    .metrics-result h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .metrics-summary {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .summary-card {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
    }
    .summary-card h4 {
      color: #172b4d;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .summary-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #0052cc;
    }
    .measurements-list {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      max-height: 300px;
      overflow-y: auto;
    }
    .measurements-table {
      width: 100%;
      border-collapse: collapse;
    }
    .measurements-table th {
      background: #f8f9fa;
      border-bottom: 1px solid #dfe1e6;
      padding: 0.75rem;
      font-weight: 600;
      font-size: 0.875rem;
      color: #172b4d;
      text-align: left;
      position: sticky;
      top: 0;
    }
    .measurements-table td {
      border-bottom: 1px solid #f1f2f4;
      padding: 0.75rem;
      font-size: 0.875rem;
      color: #172b4d;
    }
    .measurements-table tbody tr:hover {
      background: #f8f9fa;
    }
    .section-divider {
      border-top: 1px solid #dfe1e6;
      margin: 2rem 0;
      padding-top: 2rem;
    }
    @media (max-width: 768px) {
      .date-range-container,
      .query-operations,
      .metrics-summary {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    ${getHeader()}
    ${getNavigation('services')}
        <div class="content-header">
          <h1>
            <div class="status-dot status-offline" id="statusDot"></div>
            Measuring Service
          </h1>
          <p>Capture metrics and analyze measurements over time</p>
        </div>

        <!-- Add Measurement Section -->
        <div class="measuring-section">
          <div class="measuring-form">
            <h2>Add Measurement</h2>
            
            <div class="form-group">
              <label for="metricName">Metric Name:</label>
              <input type="text" id="metricName" class="form-control" placeholder="Enter metric name (e.g., cpu_usage, response_time)..." required />
            </div>
            
            <div class="form-group">
              <label for="metricValue">Value:</label>
              <input type="number" id="metricValue" class="form-control" placeholder="Enter numeric value..." step="any" required />
            </div>
            
            <button type="button" class="btn btn-success" id="addMetricButton">
              <i class="bi bi-plus-circle me-2"></i>Add Measurement
            </button>
          </div>
        </div>

        <!-- Query Measurements Section -->
        <div class="measuring-section">
          <div class="measuring-form section-divider">
            <h2>Query Measurements</h2>
            
            <div class="form-group">
              <label for="queryMetricName">Metric Name:</label>
              <input type="text" id="queryMetricName" class="form-control" placeholder="Enter metric name to query..." required />
            </div>
            
            <div class="date-range-container">
              <div class="form-group">
                <label for="startDateTime">Start Date & Time:</label>
                <input type="datetime-local" id="startDateTime" class="form-control" required />
              </div>
              
              <div class="form-group">
                <label for="endDateTime">End Date & Time:</label>
                <input type="datetime-local" id="endDateTime" class="form-control" required />
              </div>
            </div>
            
            <div class="query-operations">
              <button type="button" class="btn btn-info" id="listButton">
                <i class="bi bi-list-ul me-2"></i>List Measurements
              </button>
              <button type="button" class="btn btn-primary" id="totalButton">
                <i class="bi bi-calculator me-2"></i>Get Total
              </button>
              <button type="button" class="btn btn-warning" id="averageButton">
                <i class="bi bi-bar-chart me-2"></i>Get Average
              </button>
            </div>
          </div>
        </div>

        <div class="metrics-result" id="metricsResult" style="display: none;">
          <h3 id="resultTitle">Results</h3>
          
          <div class="metrics-summary" id="metricsSummary" style="display: none;">
            <div class="summary-card">
              <h4>Count</h4>
              <div class="summary-value" id="measurementCount">-</div>
            </div>
            <div class="summary-card">
              <h4>Total</h4>
              <div class="summary-value" id="measurementTotal">-</div>
            </div>
            <div class="summary-card">
              <h4>Average</h4>
              <div class="summary-value" id="measurementAverage">-</div>
            </div>
          </div>
          
          <div class="measurements-list" id="measurementsList" style="display: none;">
            <table class="measurements-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody id="measurementsTableBody">
              </tbody>
            </table>
          </div>
        </div>

  <!-- Toast container for Bootstrap notifications -->
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
    <div id="measuringToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <svg class="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
        <strong class="me-auto" id="toastTitle">Measuring Service</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body" id="toastMessage">
        <!-- Toast message will be inserted here -->
      </div>
    </div>
  </div>

    ${getFooter()}
  </div>

  <script>
    // Check service status on page load
    async function checkServiceStatus() {
      try {
        const response = await fetch('/api/measuring/status');
        if (response.ok) {
          document.getElementById('statusDot').className = 'status-dot status-online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        document.getElementById('statusDot').className = 'status-dot status-offline';
      }
    }

    // Show toast notification
    function showToast(message, isError = false) {
      const toast = new bootstrap.Toast(document.getElementById('measuringToast'));
      document.getElementById('toastMessage').textContent = message;
      document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
      toast.show();
    }

    // Show results
    function showResults(title, data, type = 'list') {
      const resultPanel = document.getElementById('metricsResult');
      const resultTitle = document.getElementById('resultTitle');
      const summaryPanel = document.getElementById('metricsSummary');
      const listPanel = document.getElementById('measurementsList');
      
      resultTitle.textContent = title;
      resultPanel.style.display = 'block';
      
      if (type === 'list' && Array.isArray(data)) {
        // Show measurements list
        summaryPanel.style.display = 'grid';
        listPanel.style.display = 'block';
        
        // Update summary
        document.getElementById('measurementCount').textContent = data.length;
        const total = data.reduce((sum, item) => sum + item.value, 0);
        document.getElementById('measurementTotal').textContent = total.toFixed(2);
        document.getElementById('measurementAverage').textContent = data.length > 0 ? (total / data.length).toFixed(2) : '0';
        
        // Update table
        const tableBody = document.getElementById('measurementsTableBody');
        tableBody.innerHTML = '';
        
        if (data.length === 0) {
          const row = tableBody.insertRow();
          const cell = row.insertCell(0);
          cell.colSpan = 2;
          cell.textContent = 'No measurements found for the specified period';
          cell.style.textAlign = 'center';
          cell.style.fontStyle = 'italic';
          cell.style.color = '#6b7280';
        } else {
          data.forEach(measurement => {
            const row = tableBody.insertRow();
            const timestampCell = row.insertCell(0);
            const valueCell = row.insertCell(1);
            
            timestampCell.textContent = new Date(measurement.timestamp).toLocaleString();
            valueCell.textContent = measurement.value;
          });
        }
      } else {
        // Show single value result
        summaryPanel.style.display = 'none';
        listPanel.style.display = 'none';
        
        const resultContent = document.createElement('div');
        resultContent.style.cssText = 'background: #ffffff; border: 1px solid #dfe1e6; border-radius: 4px; padding: 2rem; text-align: center; font-size: 2rem; font-weight: bold; color: #0052cc;';
        resultContent.textContent = typeof data === 'number' ? data.toFixed(2) : data;
        
        // Remove any existing result content
        const existingContent = resultPanel.querySelector('.single-result');
        if (existingContent) {
          existingContent.remove();
        }
        
        resultContent.className = 'single-result';
        resultPanel.appendChild(resultContent);
      }
      
      // Scroll to result
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Add measurement
    document.getElementById('addMetricButton').addEventListener('click', async function() {
      const metricName = document.getElementById('metricName').value.trim();
      const metricValue = parseFloat(document.getElementById('metricValue').value);
      
      if (!metricName) {
        showToast('Please enter a metric name', true);
        return;
      }
      
      if (isNaN(metricValue)) {
        showToast('Please enter a valid numeric value', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Adding...';
        
        const response = await fetch('/api/measuring/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ metric: metricName, value: metricValue })
        });
        
        if (response.ok) {
          showToast(\`Measurement added successfully: \${metricName} = \${metricValue}\`);
          
          // Clear the value field, keep metric name for convenience
          document.getElementById('metricValue').value = '';
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to add measurement: ' + error.message, true);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Add Measurement';
      }
    });

    // List measurements
    document.getElementById('listButton').addEventListener('click', async function() {
      const metricName = document.getElementById('queryMetricName').value.trim();
      const startDateTime = document.getElementById('startDateTime').value;
      const endDateTime = document.getElementById('endDateTime').value;
      
      if (!metricName || !startDateTime || !endDateTime) {
        showToast('Please fill in all fields', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Loading...';
        
        const startDate = new Date(startDateTime).toISOString();
        const endDate = new Date(endDateTime).toISOString();
        
        const response = await fetch(\`/api/measuring/list/\${encodeURIComponent(metricName)}/\${encodeURIComponent(startDate)}/\${encodeURIComponent(endDate)}\`);
        
        if (response.ok) {
          const measurements = await response.json();
          showToast(\`Found \${measurements.length} measurements\`);
          showResults(\`Measurements for "\${metricName}"\`, measurements, 'list');
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to list measurements: ' + error.message, true);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-list-ul me-2"></i>List Measurements';
      }
    });

    // Get total
    document.getElementById('totalButton').addEventListener('click', async function() {
      const metricName = document.getElementById('queryMetricName').value.trim();
      const startDateTime = document.getElementById('startDateTime').value;
      const endDateTime = document.getElementById('endDateTime').value;
      
      if (!metricName || !startDateTime || !endDateTime) {
        showToast('Please fill in all fields', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Calculating...';
        
        const startDate = new Date(startDateTime).toISOString();
        const endDate = new Date(endDateTime).toISOString();
        
        const response = await fetch(\`/api/measuring/total/\${encodeURIComponent(metricName)}/\${encodeURIComponent(startDate)}/\${encodeURIComponent(endDate)}\`);
        
        if (response.ok) {
          const total = await response.json();
          showToast('Total calculated successfully');
          showResults(\`Total for "\${metricName}"\`, total, 'single');
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to calculate total: ' + error.message, true);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-calculator me-2"></i>Get Total';
      }
    });

    // Get average
    document.getElementById('averageButton').addEventListener('click', async function() {
      const metricName = document.getElementById('queryMetricName').value.trim();
      const startDateTime = document.getElementById('startDateTime').value;
      const endDateTime = document.getElementById('endDateTime').value;
      
      if (!metricName || !startDateTime || !endDateTime) {
        showToast('Please fill in all fields', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Calculating...';
        
        const startDate = new Date(startDateTime).toISOString();
        const endDate = new Date(endDateTime).toISOString();
        
        const response = await fetch(\`/api/measuring/average/\${encodeURIComponent(metricName)}/\${encodeURIComponent(startDate)}/\${encodeURIComponent(endDate)}\`);
        
        if (response.ok) {
          const average = await response.json();
          showToast('Average calculated successfully');
          showResults(\`Average for "\${metricName}"\`, average, 'single');
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to calculate average: ' + error.message, true);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-bar-chart me-2"></i>Get Average';
      }
    });

    // Initialize default date range (last 24 hours)
    function initializeDateRange() {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Format for datetime-local input
      const formatDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return \`\${year}-\${month}-\${day}T\${hours}:\${minutes}\`;
      };
      
      document.getElementById('startDateTime').value = formatDateTime(yesterday);
      document.getElementById('endDateTime').value = formatDateTime(now);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      checkServiceStatus();
      initializeDateRange();
      
      // Check status periodically
      setInterval(checkServiceStatus, 30000); // Check every 30 seconds
    });
  </script>

  ${getSidebarToggleScript()}
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// Notifying Service Page
app.get('/services/notifying', requireServerAuth, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notifying Service - Architecture Artifacts</title>
  ${getSharedStyles()}
  <style>
    .notifying-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      margin-bottom: 2rem;
    }
    .notifying-form {
      padding: 2rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .notifying-form h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #172b4d;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      background: #ffffff;
      color: #172b4d;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
    }
    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }
    .content-header h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .status-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
    .status-online {
      background-color: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.3);
    }
    .status-offline {
      background-color: #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.3);
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .subscriber-operations {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }
    .topics-list {
      background: #f8f9fa;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 2rem;
      min-height: 120px;
    }
    .topics-list h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .topic-item {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .topic-header {
      display: flex;
      justify-content: between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .topic-name {
      font-weight: 600;
      color: #172b4d;
      font-size: 1rem;
    }
    .subscriber-count {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .subscribers-list {
      margin-top: 0.75rem;
      font-size: 0.875rem;
    }
    .subscriber-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: #f8f9fa;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }
    .callback-url {
      font-family: monospace;
      color: #6b7280;
      word-break: break-all;
      flex: 1;
      margin-right: 0.5rem;
    }
    .unsubscribe-btn {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      cursor: pointer;
      flex-shrink: 0;
    }
    .unsubscribe-btn:hover {
      background: #c82333;
    }
    .notification-result {
      background: #f8f9fa;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 2rem;
      min-height: 120px;
    }
    .notification-result h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .notification-result pre {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      padding: 1rem;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.875rem;
      color: #172b4d;
      max-height: 200px;
      overflow-y: auto;
    }
    .section-divider {
      border-top: 1px solid #dfe1e6;
      margin: 2rem 0;
      padding-top: 2rem;
    }
    @media (max-width: 768px) {
      .subscriber-operations {
        grid-template-columns: 1fr;
      }
      .topic-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .subscriber-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    ${getHeader()}
    ${getNavigation('services')}
        <div class="content-header">
          <h1>
            <div class="status-dot status-offline" id="statusDot"></div>
            Notifying Service
          </h1>
          <p>Manage topics, subscribers, and send notifications</p>
        </div>

        <!-- Create Topic Section -->
        <div class="notifying-section">
          <div class="notifying-form">
            <h2>Create Topic</h2>
            
            <div class="form-group">
              <label for="topicName">Topic Name:</label>
              <input type="text" id="topicName" class="form-control" placeholder="Enter topic name (e.g., user-updates, system-alerts)..." required />
            </div>
            
            <button type="button" class="btn btn-success" id="createTopicButton">
              <i class="bi bi-plus-circle me-2"></i>Create Topic
            </button>
          </div>
        </div>

        <!-- Subscribe to Topic Section -->
        <div class="notifying-section">
          <div class="notifying-form section-divider">
            <h2>Subscribe to Topic</h2>
            
            <div class="form-group">
              <label for="subscribeTopicName">Topic Name:</label>
              <input type="text" id="subscribeTopicName" class="form-control" placeholder="Enter existing topic name..." required />
            </div>
            
            <div class="form-group">
              <label for="callbackUrl">Callback URL:</label>
              <input type="url" id="callbackUrl" class="form-control" placeholder="Enter callback URL (e.g., https://api.example.com/webhook)..." required />
            </div>
            
            <div class="subscriber-operations">
              <button type="button" class="btn btn-primary" id="subscribeButton">
                <i class="bi bi-bell me-2"></i>Subscribe
              </button>
              <button type="button" class="btn btn-danger" id="unsubscribeButton">
                <i class="bi bi-bell-slash me-2"></i>Unsubscribe
              </button>
            </div>
          </div>
        </div>

        <!-- Send Notification Section -->
        <div class="notifying-section">
          <div class="notifying-form section-divider">
            <h2>Send Notification</h2>
            
            <div class="form-group">
              <label for="notifyTopicName">Topic Name:</label>
              <input type="text" id="notifyTopicName" class="form-control" placeholder="Enter topic name to notify..." required />
            </div>
            
            <div class="form-group">
              <label for="notificationMessage">Message:</label>
              <textarea id="notificationMessage" class="form-control" placeholder="Enter notification message..." required></textarea>
            </div>
            
            <button type="button" class="btn btn-warning" id="notifyButton">
              <i class="bi bi-send me-2"></i>Send Notification
            </button>
          </div>
        </div>

        <!-- Topics Management Display -->
        <div class="topics-list" id="topicsList">
          <h3>Active Topics & Subscribers</h3>
          <div id="topicsContainer">
            <p style="color: #6b7280; font-style: italic;">No topics created yet. Create a topic above to get started.</p>
          </div>
        </div>

        <div class="notification-result" id="notificationResult" style="display: none;">
          <h3>Operation Result</h3>
          <pre id="resultContent"></pre>
        </div>

  <!-- Toast container for Bootstrap notifications -->
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
    <div id="notifyingToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <svg class="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
        <strong class="me-auto" id="toastTitle">Notifying Service</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body" id="toastMessage">
        <!-- Toast message will be inserted here -->
      </div>
    </div>
  </div>

    ${getFooter()}
  </div>

  <script>
    // In-memory storage for UI topics and subscribers (for display purposes only)
    let topics = new Map();

    // Check service status on page load
    async function checkServiceStatus() {
      try {
        const response = await fetch('/api/notifying/status');
        if (response.ok) {
          document.getElementById('statusDot').className = 'status-dot status-online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        document.getElementById('statusDot').className = 'status-dot status-offline';
      }
    }

    // Show toast notification
    function showToast(message, isError = false) {
      const toast = new bootstrap.Toast(document.getElementById('notifyingToast'));
      document.getElementById('toastMessage').textContent = message;
      document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
      toast.show();
    }

    // Show result in result panel
    function showResult(content, title = 'Operation Result') {
      const resultPanel = document.getElementById('notificationResult');
      const resultContent = document.getElementById('resultContent');
      
      resultContent.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
      resultPanel.style.display = 'block';
      
      // Scroll to result
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Update topics display
    function updateTopicsDisplay() {
      const container = document.getElementById('topicsContainer');
      
      if (topics.size === 0) {
        container.innerHTML = '<p style="color: #6b7280; font-style: italic;">No topics created yet. Create a topic above to get started.</p>';
        return;
      }
      
      let html = '';
      topics.forEach((subscribers, topicName) => {
        html += \`
          <div class="topic-item">
            <div class="topic-header">
              <div class="topic-name">\${topicName}</div>
              <div class="subscriber-count">\${subscribers.size} subscriber\${subscribers.size !== 1 ? 's' : ''}</div>
            </div>
            <div class="subscribers-list">
        \`;
        
        if (subscribers.size === 0) {
          html += '<p style="color: #6b7280; font-style: italic; margin: 0;">No subscribers yet</p>';
        } else {
          subscribers.forEach(callbackUrl => {
            html += \`
              <div class="subscriber-item">
                <div class="callback-url">\${callbackUrl}</div>
                <button class="unsubscribe-btn" onclick="removeSubscriber('\${topicName}', '\${callbackUrl}')">
                  Remove
                </button>
              </div>
            \`;
          });
        }
        
        html += '</div></div>';
      });
      
      container.innerHTML = html;
    }

    // Remove subscriber from UI and server
    async function removeSubscriber(topicName, callbackUrl) {
      try {
        const response = await fetch(\`/api/notifying/unsubscribe/topic/\${encodeURIComponent(topicName)}\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ callbackUrl: callbackUrl })
        });
        
        if (response.ok) {
          // Update local storage
          if (topics.has(topicName)) {
            topics.get(topicName).delete(callbackUrl);
          }
          updateTopicsDisplay();
          showToast(\`Unsubscribed \${callbackUrl} from \${topicName}\`);
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to unsubscribe: ' + error.message, true);
      }
    }

    // Create topic
    document.getElementById('createTopicButton').addEventListener('click', async function() {
      const topicName = document.getElementById('topicName').value.trim();
      
      if (!topicName) {
        showToast('Please enter a topic name', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Creating...';
        
        const response = await fetch('/api/notifying/topic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ topic: topicName })
        });
        
        if (response.ok) {
          // Add to local storage
          if (!topics.has(topicName)) {
            topics.set(topicName, new Set());
          }
          updateTopicsDisplay();
          showToast(\`Topic "\${topicName}" created successfully\`);
          showResult(\`Topic "\${topicName}" created successfully\`);
          
          // Clear the input
          document.getElementById('topicName').value = '';
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to create topic: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Create Topic';
      }
    });

    // Subscribe to topic
    document.getElementById('subscribeButton').addEventListener('click', async function() {
      const topicName = document.getElementById('subscribeTopicName').value.trim();
      const callbackUrl = document.getElementById('callbackUrl').value.trim();
      
      if (!topicName) {
        showToast('Please enter a topic name', true);
        return;
      }
      
      if (!callbackUrl) {
        showToast('Please enter a callback URL', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Subscribing...';
        
        const response = await fetch(\`/api/notifying/subscribe/topic/\${encodeURIComponent(topicName)}\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ callbackUrl: callbackUrl })
        });
        
        if (response.ok) {
          // Update local storage
          if (!topics.has(topicName)) {
            topics.set(topicName, new Set());
          }
          topics.get(topicName).add(callbackUrl);
          updateTopicsDisplay();
          showToast(\`Subscribed to "\${topicName}" successfully\`);
          showResult(\`Subscribed \${callbackUrl} to topic "\${topicName}"\`);
          
          // Clear the callback URL field
          document.getElementById('callbackUrl').value = '';
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to subscribe: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-bell me-2"></i>Subscribe';
      }
    });

    // Unsubscribe from topic
    document.getElementById('unsubscribeButton').addEventListener('click', async function() {
      const topicName = document.getElementById('subscribeTopicName').value.trim();
      const callbackUrl = document.getElementById('callbackUrl').value.trim();
      
      if (!topicName) {
        showToast('Please enter a topic name', true);
        return;
      }
      
      if (!callbackUrl) {
        showToast('Please enter a callback URL', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Unsubscribing...';
        
        const response = await fetch(\`/api/notifying/unsubscribe/topic/\${encodeURIComponent(topicName)}\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ callbackUrl: callbackUrl })
        });
        
        if (response.ok) {
          // Update local storage
          if (topics.has(topicName)) {
            topics.get(topicName).delete(callbackUrl);
          }
          updateTopicsDisplay();
          showToast(\`Unsubscribed from "\${topicName}" successfully\`);
          showResult(\`Unsubscribed \${callbackUrl} from topic "\${topicName}"\`);
          
          // Clear the callback URL field
          document.getElementById('callbackUrl').value = '';
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to unsubscribe: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-bell-slash me-2"></i>Unsubscribe';
      }
    });

    // Send notification
    document.getElementById('notifyButton').addEventListener('click', async function() {
      const topicName = document.getElementById('notifyTopicName').value.trim();
      const message = document.getElementById('notificationMessage').value.trim();
      
      if (!topicName) {
        showToast('Please enter a topic name', true);
        return;
      }
      
      if (!message) {
        showToast('Please enter a notification message', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Sending...';
        
        const response = await fetch(\`/api/notifying/notify/topic/\${encodeURIComponent(topicName)}\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: message })
        });
        
        if (response.ok) {
          const subscriberCount = topics.has(topicName) ? topics.get(topicName).size : 0;
          showToast(\`Notification sent to "\${topicName}" (\${subscriberCount} subscribers)\`);
          showResult(\`Notification sent to topic "\${topicName}"\\nMessage: \${message}\\nSubscribers notified: \${subscriberCount}\`);
          
          // Clear the message field
          document.getElementById('notificationMessage').value = '';
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to send notification: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-send me-2"></i>Send Notification';
      }
    });

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      checkServiceStatus();
      updateTopicsDisplay();
      
      // Check status periodically
      setInterval(checkServiceStatus, 30000); // Check every 30 seconds
    });
  </script>

  ${getSidebarToggleScript()}
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// Scheduling Service Page
app.get('/services/scheduling', requireServerAuth, (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scheduling Service - Architecture Artifacts</title>
  ${getSharedStyles()}
  <style>
    .scheduling-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      margin-bottom: 2rem;
    }
    .scheduling-form {
      padding: 2rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    .scheduling-form h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #172b4d;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      background: #ffffff;
      color: #172b4d;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #0052cc;
      box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
    }
    .content-header h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .status-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
    .status-online {
      background-color: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.3);
    }
    .status-offline {
      background-color: #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.3);
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .cron-examples {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 1rem;
      margin-top: 0.5rem;
      font-size: 0.875rem;
    }
    .cron-examples h4 {
      color: #172b4d;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .cron-example {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
      font-family: monospace;
    }
    .cron-pattern {
      color: #0052cc;
      font-weight: 500;
    }
    .cron-description {
      color: #6b7280;
      font-style: italic;
    }
    .schedules-list {
      background: #f8f9fa;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 2rem;
      min-height: 120px;
    }
    .schedules-list h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .schedule-item {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .schedule-info {
      flex: 1;
    }
    .schedule-name {
      font-weight: 600;
      color: #172b4d;
      font-size: 1rem;
      margin-bottom: 0.25rem;
    }
    .schedule-details {
      font-size: 0.875rem;
      color: #6b7280;
      font-family: monospace;
    }
    .delete-schedule-btn {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      cursor: pointer;
      margin-left: 1rem;
    }
    .delete-schedule-btn:hover {
      background: #c82333;
    }
    .scheduling-result {
      background: #f8f9fa;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 2rem;
      min-height: 120px;
    }
    .scheduling-result h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .scheduling-result pre {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 4px;
      padding: 1rem;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.875rem;
      color: #172b4d;
      max-height: 200px;
      overflow-y: auto;
    }
    .section-divider {
      border-top: 1px solid #dfe1e6;
      margin: 2rem 0;
      padding-top: 2rem;
    }
    .help-text {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 0.5rem;
      font-style: italic;
    }
    @media (max-width: 768px) {
      .schedule-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .delete-schedule-btn {
        margin-left: 0;
        align-self: flex-end;
      }
      .cron-example {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    ${getHeader()}
    ${getNavigation('services')}
        <div class="content-header">
          <h1>
            <div class="status-dot status-offline" id="statusDot"></div>
            Scheduling Service
          </h1>
          <p>Create and manage scheduled tasks with cron expressions</p>
        </div>

        <!-- Create Schedule Section -->
        <div class="scheduling-section">
          <div class="scheduling-form">
            <h2>Create Schedule</h2>
            
            <div class="form-group">
              <label for="scheduleName">Schedule Name:</label>
              <input type="text" id="scheduleName" class="form-control" placeholder="Enter unique schedule name (e.g., daily-backup, hourly-sync)..." required />
              <div class="help-text">This name will serve as the task identifier for the schedule</div>
            </div>
            
            <div class="form-group">
              <label for="scriptFilename">Script Filename:</label>
              <input type="text" id="scriptFilename" class="form-control" placeholder="Enter Node.js script filename (e.g., backup.js, sync-data.js)..." required />
              <div class="help-text">The Node.js file to execute on schedule (relative to project root)</div>
            </div>
            
            <div class="form-group">
              <label for="cronExpression">Cron Expression:</label>
              <input type="text" id="cronExpression" class="form-control" placeholder="Enter cron expression (e.g., 0 */6 * * *)..." required />
              <div class="help-text">Standard cron format: minute hour day month weekday</div>
              
              <div class="cron-examples">
                <h4>Common Cron Patterns:</h4>
                <div class="cron-example">
                  <span class="cron-pattern">0 */6 * * *</span>
                  <span class="cron-description">Every 6 hours</span>
                </div>
                <div class="cron-example">
                  <span class="cron-pattern">0 0 * * *</span>
                  <span class="cron-description">Daily at midnight</span>
                </div>
                <div class="cron-example">
                  <span class="cron-pattern">0 0 * * 0</span>
                  <span class="cron-description">Weekly on Sunday</span>
                </div>
                <div class="cron-example">
                  <span class="cron-pattern">*/15 * * * *</span>
                  <span class="cron-description">Every 15 minutes</span>
                </div>
                <div class="cron-example">
                  <span class="cron-pattern">0 9 * * 1-5</span>
                  <span class="cron-description">Weekdays at 9 AM</span>
                </div>
              </div>
            </div>
            
            <button type="button" class="btn btn-success" id="createScheduleButton">
              <i class="bi bi-calendar-plus me-2"></i>Create Schedule
            </button>
          </div>
        </div>

        <!-- Delete Schedule Section -->
        <div class="scheduling-section">
          <div class="scheduling-form section-divider">
            <h2>Delete Schedule</h2>
            
            <div class="form-group">
              <label for="deleteScheduleName">Schedule Name to Delete:</label>
              <input type="text" id="deleteScheduleName" class="form-control" placeholder="Enter schedule name to delete..." required />
              <div class="help-text">Enter the exact name of the schedule you want to cancel</div>
            </div>
            
            <button type="button" class="btn btn-danger" id="deleteScheduleButton">
              <i class="bi bi-calendar-x me-2"></i>Delete Schedule
            </button>
          </div>
        </div>

        <!-- Active Schedules Display -->
        <div class="schedules-list" id="schedulesList">
          <h3>Active Schedules</h3>
          <div id="schedulesContainer">
            <p style="color: #6b7280; font-style: italic;">No active schedules. Create a schedule above to get started.</p>
          </div>
        </div>

        <div class="scheduling-result" id="schedulingResult" style="display: none;">
          <h3>Operation Result</h3>
          <pre id="resultContent"></pre>
        </div>

  <!-- Toast container for Bootstrap notifications -->
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
    <div id="schedulingToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <svg class="bd-placeholder-img rounded me-2" width="20" height="20" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="100%" height="100%" fill="#007aff"></rect></svg>
        <strong class="me-auto" id="toastTitle">Scheduling Service</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body" id="toastMessage">
        <!-- Toast message will be inserted here -->
      </div>
    </div>
  </div>

    ${getFooter()}
  </div>

  <script>
    // In-memory storage for UI schedules (for display purposes only)
    let schedules = new Map();

    // Check service status on page load
    async function checkServiceStatus() {
      try {
        const response = await fetch('/api/scheduling/status');
        if (response.ok) {
          document.getElementById('statusDot').className = 'status-dot status-online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        document.getElementById('statusDot').className = 'status-dot status-offline';
      }
    }

    // Show toast notification
    function showToast(message, isError = false) {
      const toast = new bootstrap.Toast(document.getElementById('schedulingToast'));
      document.getElementById('toastMessage').textContent = message;
      document.getElementById('toastTitle').textContent = isError ? 'Error' : 'Success';
      toast.show();
    }

    // Show result in result panel
    function showResult(content, title = 'Operation Result') {
      const resultPanel = document.getElementById('schedulingResult');
      const resultContent = document.getElementById('resultContent');
      
      resultContent.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
      resultPanel.style.display = 'block';
      
      // Scroll to result
      resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Validate cron expression (basic validation)
    function isValidCronExpression(cron) {
      // Basic cron validation - should have 5 parts separated by spaces
      const parts = cron.trim().split(/\\s+/);
      if (parts.length !== 5) return false;
      
      // Each part should contain valid characters for cron
      const cronRegex = /^[0-9,*\\/\\-]+$/;
      return parts.every(part => cronRegex.test(part));
    }

    // Update schedules display
    function updateSchedulesDisplay() {
      const container = document.getElementById('schedulesContainer');
      
      if (schedules.size === 0) {
        container.innerHTML = '<p style="color: #6b7280; font-style: italic;">No active schedules. Create a schedule above to get started.</p>';
        return;
      }
      
      let html = '';
      schedules.forEach((schedule, scheduleName) => {
        html += \`
          <div class="schedule-item">
            <div class="schedule-info">
              <div class="schedule-name">\${scheduleName}</div>
              <div class="schedule-details">Script: \${schedule.script} | Cron: \${schedule.cron}</div>
            </div>
            <button class="delete-schedule-btn" onclick="deleteScheduleFromList('\${scheduleName}')">
              <i class="bi bi-trash me-1"></i>Delete
            </button>
          </div>
        \`;
      });
      
      container.innerHTML = html;
    }

    // Delete schedule from UI and server
    async function deleteScheduleFromList(scheduleName) {
      try {
        const response = await fetch(\`/api/scheduling/cancel/\${encodeURIComponent(scheduleName)}\`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Update local storage
          schedules.delete(scheduleName);
          updateSchedulesDisplay();
          showToast(\`Schedule "\${scheduleName}" deleted successfully\`);
          showResult(\`Schedule "\${scheduleName}" has been cancelled and removed\`);
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to delete schedule: ' + error.message, true);
        showResult(\`Error deleting schedule: \${error.message}\`);
      }
    }

    // Create schedule
    document.getElementById('createScheduleButton').addEventListener('click', async function() {
      const scheduleName = document.getElementById('scheduleName').value.trim();
      const scriptFilename = document.getElementById('scriptFilename').value.trim();
      const cronExpression = document.getElementById('cronExpression').value.trim();
      
      if (!scheduleName) {
        showToast('Please enter a schedule name', true);
        return;
      }
      
      if (!scriptFilename) {
        showToast('Please enter a script filename', true);
        return;
      }
      
      if (!cronExpression) {
        showToast('Please enter a cron expression', true);
        return;
      }
      
      if (!isValidCronExpression(cronExpression)) {
        showToast('Please enter a valid cron expression (5 parts: minute hour day month weekday)', true);
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Creating...';
        
        const response = await fetch('/api/scheduling/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            task: scheduleName,
            cron: cronExpression
          })
        });
        
        if (response.ok) {
          // Add to local storage
          schedules.set(scheduleName, {
            script: scriptFilename,
            cron: cronExpression
          });
          updateSchedulesDisplay();
          showToast(\`Schedule "\${scheduleName}" created successfully\`);
          showResult(\`Schedule created:\\nName: \${scheduleName}\\nScript: \${scriptFilename}\\nCron: \${cronExpression}\`);
          
          // Clear the inputs
          document.getElementById('scheduleName').value = '';
          document.getElementById('scriptFilename').value = '';
          document.getElementById('cronExpression').value = '';
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to create schedule: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-calendar-plus me-2"></i>Create Schedule';
      }
    });

    // Delete schedule by name
    document.getElementById('deleteScheduleButton').addEventListener('click', async function() {
      const scheduleName = document.getElementById('deleteScheduleName').value.trim();
      
      if (!scheduleName) {
        showToast('Please enter a schedule name to delete', true);
        return;
      }
      
      if (!confirm(\`Are you sure you want to delete the schedule "\${scheduleName}"?\`)) {
        return;
      }
      
      try {
        this.disabled = true;
        this.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Deleting...';
        
        const response = await fetch(\`/api/scheduling/cancel/\${encodeURIComponent(scheduleName)}\`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Update local storage
          schedules.delete(scheduleName);
          updateSchedulesDisplay();
          showToast(\`Schedule "\${scheduleName}" deleted successfully\`);
          showResult(\`Schedule "\${scheduleName}" has been cancelled and removed\`);
          
          // Clear the input
          document.getElementById('deleteScheduleName').value = '';
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (error) {
        showToast('Failed to delete schedule: ' + error.message, true);
        showResult(\`Error: \${error.message}\`);
      } finally {
        this.disabled = false;
        this.innerHTML = '<i class="bi bi-calendar-x me-2"></i>Delete Schedule';
      }
    });

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      checkServiceStatus();
      updateSchedulesDisplay();
      
      // Check status periodically
      setInterval(checkServiceStatus, 30000); // Check every 30 seconds
    });
  </script>

  ${getSidebarToggleScript()}
  ${getThemeToggleScript()}
</body>
</html>`;
  
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
</head>
<body>
  <div class="app">
    <div class="d-flex justify-content-center align-items-center" style="height: 100vh; background: var(--confluence-bg);">
      <div class="text-center" style="max-width: 400px; padding: 2rem;">
        <div class="mb-4">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="mb-3">
            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" stroke-width="2" stroke-linejoin="round"/>
            <path d="M12 22V12" stroke="#0052cc" stroke-width="2"/>
            <path d="M2 7L12 12L22 7" stroke="#0052cc" stroke-width="2"/>
          </svg>
        </div>
        <h2 class="text-confluence-text mb-3">Server Administration</h2>
        <p class="text-muted mb-4">Please sign in to access the server interface.</p>
        
        <div class="card" style="text-align: left;">
          <div class="card-body">
            <form id="loginForm">
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
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server Dashboard - Architecture Artifacts</title>
  ${getSharedStyles()}
</head>
<body>
  <div class="app">
    ${getHeader()}
    ${getNavigation('overview')}
        <div class="content-header">
          <div>
            <h1>Server Dashboard</h1>
            <p>Welcome back, <strong>${req.user.username}</strong>! Overview of your Architecture Artifacts system</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline-secondary btn-sm" onclick="logout()">
              <i class="bi bi-box-arrow-right me-1"></i>Logout
            </button>
          </div>
        </div>
        
        <div class="dashboard-overview">
          <div class="overview-section">
            <h2>Quick Actions</h2>
            <div class="action-grid">
              <a href="/settings" class="action-card">
                <div class="action-icon">⚙️</div>
                <h3>Settings</h3>
                <p>Configure Git repository and system settings</p>
              </a>
              
              <a href="/monitoring/api" class="action-card">
                <div class="action-icon">📊</div>
                <h3>API Monitor</h3>
                <p>Monitor API calls and system performance</p>
              </a>
            </div>
          </div>
          
          <div class="overview-section">
            <h2>System Status</h2>
            <div class="status-grid">
              <div class="status-card">
                <div class="status-indicator green"></div>
                <div class="status-content">
                  <h3>Server Status</h3>
                  <p>Running normally</p>
                </div>
              </div>
              
              <div class="status-card">
                <div class="status-indicator blue"></div>
                <div class="status-content">
                  <h3>API Endpoints</h3>
                  <p>All endpoints operational</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="overview-section">
            <h2>Services</h2>
            <div class="status-grid">
              <div class="status-card clickable-card" onclick="navigateToLoggingService()">
                <div class="status-dot status-offline" id="loggingServiceDot"></div>
                <div class="status-content">
                  <h3>Logging Service</h3>
                  <p id="loggingServiceStatus">Checking status...</p>
                </div>
              </div>
              
              <div class="status-card clickable-card" onclick="navigateToCachingService()">
                <div class="status-dot status-offline" id="cachingServiceDot"></div>
                <div class="status-content">
                  <h3>Caching Service</h3>
                  <p id="cachingServiceStatus">Checking status...</p>
                </div>
              </div>
              
              <div class="status-card clickable-card" onclick="navigateToQueueingService()">
                <div class="status-dot status-offline" id="queueingServiceDot"></div>
                <div class="status-content">
                  <h3>Queueing Service</h3>
                  <p id="queueingServiceStatus">Checking status...</p>
                </div>
              </div>
              
              <div class="status-card clickable-card" onclick="navigateToMeasuringService()">
                <div class="status-dot status-offline" id="measuringServiceDot"></div>
                <div class="status-content">
                  <h3>Measuring Service</h3>
                  <p id="measuringServiceStatus">Checking status...</p>
                </div>
              </div>
              
              <div class="status-card clickable-card" onclick="navigateToNotifyingService()">
                <div class="status-dot status-offline" id="notifyingServiceDot"></div>
                <div class="status-content">
                  <h3>Notifying Service</h3>
                  <p id="notifyingServiceStatus">Checking status...</p>
                </div>
              </div>
              
              <div class="status-card clickable-card" onclick="navigateToSchedulingService()">
                <div class="status-dot status-offline" id="schedulingServiceDot"></div>
                <div class="status-content">
                  <h3>Scheduling Service</h3>
                  <p id="schedulingServiceStatus">Checking status...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
    ${getFooter()}
  </div>

  <style>
    .dashboard-overview {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    
    .overview-section {
      background: #ffffff;
      border: 1px solid #dfe1e6;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    
    .overview-section h2 {
      color: #172b4d;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    
    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }
    
    .action-card {
      display: block;
      padding: 1.5rem;
      background: #f4f5f7;
      border: 1px solid #dfe1e6;
      border-radius: 6px;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
    }
    
    .action-card:hover {
      background: #e4edfc;
      border-color: #0052cc;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .action-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    
    .action-card h3 {
      color: #172b4d;
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .action-card p {
      color: #5e6c84;
      font-size: 0.875rem;
      margin: 0;
    }
    
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .status-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f4f5f7;
      border: 1px solid #dfe1e6;
      border-radius: 6px;
    }
    
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .status-indicator.green {
      background: #36b37e;
    }
    
    .status-indicator.blue {
      background: #0052cc;
    }
    
    .status-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }
    
    .status-online {
      background-color: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.3);
    }
    
    .status-offline {
      background-color: #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.3);
    }
    
    .clickable-card {
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .clickable-card:hover {
      background: #e4edfc;
      border-color: #0052cc;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    
    .status-content h3 {
      color: #172b4d;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .status-content p {
      color: #5e6c84;
      font-size: 0.875rem;
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
  </style>
  
  <script>
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
    
    // Navigate to logging service page
    function navigateToLoggingService() {
      window.location.href = '/services/logging';
    }
    
    // Navigate to caching service page
    function navigateToCachingService() {
      window.location.href = '/services/caching';
    }
    
    // Navigate to queueing service page
    function navigateToQueueingService() {
      window.location.href = '/services/queueing';
    }
    
    // Navigate to measuring service page
    function navigateToMeasuringService() {
      window.location.href = '/services/measuring';
    }
    
    // Navigate to notifying service page
    function navigateToNotifyingService() {
      window.location.href = '/services/notifying';
    }
    
    // Navigate to scheduling service page
    function navigateToSchedulingService() {
      window.location.href = '/services/scheduling';
    }
    
    // Check logging service status
    async function checkLoggingServiceStatus() {
      try {
        const response = await fetch('/api/logging/status');
        const statusDot = document.getElementById('loggingServiceDot');
        const statusText = document.getElementById('loggingServiceStatus');
        
        if (response.ok) {
          statusDot.className = 'status-dot status-online';
          statusText.textContent = 'Service Online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        const statusDot = document.getElementById('loggingServiceDot');
        const statusText = document.getElementById('loggingServiceStatus');
        statusDot.className = 'status-dot status-offline';
        statusText.textContent = 'Service Offline';
      }
    }
    
    // Check caching service status
    async function checkCachingServiceStatus() {
      try {
        const response = await fetch('/api/caching/status');
        const statusDot = document.getElementById('cachingServiceDot');
        const statusText = document.getElementById('cachingServiceStatus');
        
        if (response.ok) {
          statusDot.className = 'status-dot status-online';
          statusText.textContent = 'Service Online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        const statusDot = document.getElementById('cachingServiceDot');
        const statusText = document.getElementById('cachingServiceStatus');
        statusDot.className = 'status-dot status-offline';
        statusText.textContent = 'Service Offline';
      }
    }
    
    // Check queueing service status
    async function checkQueueingServiceStatus() {
      try {
        const response = await fetch('/api/queueing/status');
        const statusDot = document.getElementById('queueingServiceDot');
        const statusText = document.getElementById('queueingServiceStatus');
        
        if (response.ok) {
          statusDot.className = 'status-dot status-online';
          statusText.textContent = 'Service Online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        const statusDot = document.getElementById('queueingServiceDot');
        const statusText = document.getElementById('queueingServiceStatus');
        statusDot.className = 'status-dot status-offline';
        statusText.textContent = 'Service Offline';
      }
    }
    
    // Check measuring service status
    async function checkMeasuringServiceStatus() {
      try {
        const response = await fetch('/api/measuring/status');
        const statusDot = document.getElementById('measuringServiceDot');
        const statusText = document.getElementById('measuringServiceStatus');
        
        if (response.ok) {
          statusDot.className = 'status-dot status-online';
          statusText.textContent = 'Service Online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        const statusDot = document.getElementById('measuringServiceDot');
        const statusText = document.getElementById('measuringServiceStatus');
        statusDot.className = 'status-dot status-offline';
        statusText.textContent = 'Service Offline';
      }
    }
    
    // Check notifying service status
    async function checkNotifyingServiceStatus() {
      try {
        const response = await fetch('/api/notifying/status');
        const statusDot = document.getElementById('notifyingServiceDot');
        const statusText = document.getElementById('notifyingServiceStatus');
        
        if (response.ok) {
          statusDot.className = 'status-dot status-online';
          statusText.textContent = 'Service Online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        const statusDot = document.getElementById('notifyingServiceDot');
        const statusText = document.getElementById('notifyingServiceStatus');
        statusDot.className = 'status-dot status-offline';
        statusText.textContent = 'Service Offline';
      }
    }
    
    // Check scheduling service status
    async function checkSchedulingServiceStatus() {
      try {
        const response = await fetch('/api/scheduling/status');
        const statusDot = document.getElementById('schedulingServiceDot');
        const statusText = document.getElementById('schedulingServiceStatus');
        
        if (response.ok) {
          statusDot.className = 'status-dot status-online';
          statusText.textContent = 'Service Online';
        } else {
          throw new Error('Service unavailable');
        }
      } catch (error) {
        const statusDot = document.getElementById('schedulingServiceDot');
        const statusText = document.getElementById('schedulingServiceStatus');
        statusDot.className = 'status-dot status-offline';
        statusText.textContent = 'Service Offline';
      }
    }
    
    // Initialize services status check on page load
    document.addEventListener('DOMContentLoaded', function() {
      checkLoggingServiceStatus();
      checkCachingServiceStatus();
      checkQueueingServiceStatus();
      checkMeasuringServiceStatus();
      checkNotifyingServiceStatus();
      checkSchedulingServiceStatus();
      
      // Check status periodically
      setInterval(() => {
        checkLoggingServiceStatus();
        checkCachingServiceStatus();
        checkQueueingServiceStatus();
        checkMeasuringServiceStatus();
        checkNotifyingServiceStatus();
        checkSchedulingServiceStatus();
      }, 30000); // Check every 30 seconds
    });
  </script>
  ${getSidebarToggleScript()}
  ${getThemeToggleScript()}
</body>
</html>`;
  
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
