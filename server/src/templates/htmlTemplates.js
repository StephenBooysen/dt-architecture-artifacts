/**
 * @fileoverview HTML template generation functions for server pages.
 * Contains shared styles, header, navigation, footer, and client-side scripts.
 */

/**
 * Generates shared CSS styles and dependencies for all server pages.
 * 
 * This function returns a complete CSS stylesheet including Bootstrap,
 * Bootstrap Icons, custom theme variables, and responsive design rules.
 * Includes both light and dark theme support with Confluence-inspired styling.
 * 
 * @returns {string} HTML string containing CSS styles and external dependencies
 */
function getSharedStyles() {
  return `
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css">
    <link rel="stylesheet" href="/css/server-styles.css">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>`;
}

/**
 * Generates the header HTML section for server pages.
 * 
 * Creates a responsive navigation header with branding, server status indicator,
 * theme toggle button, and logout functionality. Includes the Architecture
 * Artifacts logo and navigation elements.
 * 
 * @returns {string} HTML string for the page header
 */
function getHeader() {
  return `
    <header class="app-header">
      <nav class="navbar navbar-expand-lg">
        <div class="container-fluid">
          <div class="d-flex align-items-center w-100">
            <a class="navbar-brand fw-medium me-3 d-flex align-items-center" href="/">
              <img src="/stech-black.png" alt="Design Artifacts" width="20" height="20" class="me-2" />
              Design Artifacts Server
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

/**
 * Generates the sidebar navigation HTML for server pages.
 * 
 * Creates a collapsible sidebar with navigation sections for Overview,
 * Settings, Monitoring, and Services. Highlights the currently active
 * section and provides links to all server management pages.
 * 
 * @param {string} activeSection - The currently active navigation section
 * @returns {string} HTML string for the sidebar navigation
 */
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

/**
 * Generates the footer HTML section for server pages.
 * 
 * Creates a simple footer with copyright information and consistent
 * styling across all server administration pages.
 * 
 * @returns {string} HTML string for the page footer
 */
function getFooter() {
  return `
      </section>
    </main>

    <footer class="app-footer">
      <div class="container-fluid">
        <p class="mb-0 text-center small">© 2025 Design Artifacts Server - All rights reserved.</p>
      </div>
    </footer>
  `;
}

module.exports = {
  getSharedStyles,
  getHeader,
  getNavigation,
  getFooter
};