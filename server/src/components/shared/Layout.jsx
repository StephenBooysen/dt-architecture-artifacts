import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const Layout = ({ children, activeSection, title }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`${title} - Architecture Artifacts`}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link 
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" 
          rel="stylesheet" 
          integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" 
          crossOrigin="anonymous" 
        />
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css" 
        />
        <style dangerouslySetInnerHTML={{__html: `
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
            transition: margin-left 0.3s ease;
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
          }

          /* Additional component styles will be included via props */
        `}} />
      </head>
      <body>
        <div className="app">
          <Header />
          <main className="app-main">
            <Sidebar activeSection={activeSection} />
            <section className="editor-section">
              {children}
            </section>
          </main>
          <Footer />
        </div>
        
        <script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" 
          integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" 
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{__html: `
          let sidebarCollapsed = false;
          
          function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const icon = document.getElementById('sidebar-toggle-icon');
            
            sidebarCollapsed = !sidebarCollapsed;
            
            if (sidebarCollapsed) {
              sidebar.style.marginLeft = '-250px';
              icon.className = 'bi bi-list';
            } else {
              sidebar.style.marginLeft = '0';
              icon.className = 'bi bi-x-lg';
            }
          }
        `}} />
      </body>
    </html>
  );
};

export default Layout;