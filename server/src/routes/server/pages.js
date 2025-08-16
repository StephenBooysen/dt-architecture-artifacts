/**
 * @fileoverview Server administration page routes.
 * Handles rendering of server dashboard, settings, monitoring, and service pages.
 */

const express = require('express');
const { renderComponent } = require('../../utils/reactRenderer');
const { requireServerAuth } = require('../../middleware/auth');
const router = express.Router();

// Settings page (simplified, no Git integration)
router.get('/settings', requireServerAuth, (req, res) => {
  const html = renderComponent('settings', {
    activeSection: 'settings',
    title: 'Settings - Design Artifacts'
  });
  res.send(html);
});

// API monitoring page
router.get('/monitoring/api', requireServerAuth, (req, res) => {
  const html = renderComponent('apimonitor', {
    activeSection: 'monitoring',
    title: 'API Monitor - Design Artifacts'
  });
  res.send(html);
});

// Serve OpenAPI specification
router.get('/api-spec/swagger.json', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const swaggerPath = path.join(__dirname, '../../openapi/swagger.json');
  
  try {
    const swaggerSpec = fs.readFileSync(swaggerPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  } catch (error) {
    console.error('Error serving OpenAPI specification:', error);
    res.status(500).json({ error: 'Failed to load API specification' });
  }
});

// Service pages
const servicePages = [
  { path: '/services/logging', component: 'logging', title: 'Logging Service' },
  { path: '/services/caching', component: 'caching', title: 'Caching Service' },
  { path: '/services/queueing', component: 'queueing', title: 'Queueing Service' },
  { path: '/services/measuring', component: 'measuring', title: 'Measuring Service' },
  { path: '/services/notifying', component: 'notifying', title: 'Notifying Service' },
  { path: '/services/scheduling', component: 'scheduling', title: 'Scheduling Service' },
  { path: '/services/working', component: 'working', title: 'Working Service' },
  { path: '/services/workflow', component: 'workflow', title: 'Workflow Service' },
  { path: '/services/searching', component: 'searching', title: 'Searching Service' }
];

servicePages.forEach(({ path, component, title }) => {
  router.get(path, requireServerAuth, (req, res) => {
    const html = renderComponent(component, {
      activeSection: component,
      title: `${title} - Architecture Artifacts`
    });
    res.send(html);
  });
});

// Users management page
router.get('/users', requireServerAuth, (req, res) => {
  const html = renderComponent('users', {
    activeSection: 'users',
    title: 'Users Management - Architecture Artifacts'
  });
  res.send(html);
});

// Spaces management page
router.get('/spaces', requireServerAuth, (req, res) => {
  const html = renderComponent('spaces', {
    activeSection: 'spaces',
    title: 'Spaces Management - Architecture Artifacts'
  });
  res.send(html);
});

// Git status page
router.get('/git-status', requireServerAuth, (req, res) => {
  const html = renderComponent('gitstatus', {
    activeSection: 'git-status',
    title: 'Git Status & Space Management - Architecture Artifacts'
  });
  res.send(html);
});

// Server dashboard (protected)
router.get('/server-dashboard', requireServerAuth, (req, res) => {
  const html = renderComponent('dashboard', {
    activeSection: 'overview',
    title: 'Server Dashboard - Design Artifacts',
    user: req.user
  });
  res.send(html);
});

// Test React rendering - Simple version
router.get('/test-react', (req, res) => {
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

module.exports = router;