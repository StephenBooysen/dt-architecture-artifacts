// Register Babel to compile JSX on the fly
require('@babel/register')({
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-transform-runtime'
  ],
  extensions: ['.jsx', '.js']
});

const React = require('react');
const { renderToString } = require('react-dom/server');

// Import React components
const Layout = require('../components/shared/Layout.jsx').default;
const Dashboard = require('../components/pages/Dashboard.jsx').default;
const Settings = require('../components/pages/Settings.jsx').default;
const APIMonitor = require('../components/pages/APIMonitor.jsx').default;

/**
 * Render a React component to HTML string
 * @param {string} component - Component name to render
 * @param {Object} props - Props to pass to the component
 * @returns {string} HTML string
 */
function renderComponent(component, props = {}) {
  let ComponentToRender;
  let pageComponent;
  
  switch (component) {
    case 'dashboard':
      pageComponent = React.createElement(Dashboard);
      break;
    case 'settings':
      pageComponent = React.createElement(Settings);
      break;
    case 'apimonitor':
      pageComponent = React.createElement(APIMonitor);
      break;
    default:
      pageComponent = React.createElement('div', null, 'Page not found');
  }

  // Wrap the page component in the Layout
  ComponentToRender = React.createElement(Layout, {
    activeSection: props.activeSection || 'overview',
    title: props.title || 'Dashboard'
  }, pageComponent);

  const html = renderToString(ComponentToRender);
  return `<!DOCTYPE html>${html}`;
}

module.exports = {
  renderComponent
};