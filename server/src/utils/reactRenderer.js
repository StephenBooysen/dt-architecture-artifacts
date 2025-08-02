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
const Caching = require('../components/pages/Caching.jsx').default;
const Filing = require('../components/pages/Filing.jsx').default;
const Logging = require('../components/pages/Logging.jsx').default;
const Measuring = require('../components/pages/Measuring.jsx').default;
const Notifying = require('../components/pages/Notifying.jsx').default;
const Queueing = require('../components/pages/Queueing.jsx').default;
const Scheduling = require('../components/pages/Scheduling.jsx').default;
const Searching = require('../components/pages/Searching.jsx').default;
const Workflow = require('../components/pages/Workflow.jsx').default;
const Working = require('../components/pages/Working.jsx').default;
const SwaggerUI = require('../components/pages/SwaggerUI.jsx').default;
const Users = require('../components/pages/Users.jsx').default;
const Spaces = require('../components/pages/Spaces.jsx').default;

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
    case 'caching':
      pageComponent = React.createElement(Caching);
      break;
    case 'filing':
      pageComponent = React.createElement(Filing);
      break;
    case 'logging':
      pageComponent = React.createElement(Logging);
      break;
    case 'measuring':
      pageComponent = React.createElement(Measuring);
      break;
    case 'notifying':
      pageComponent = React.createElement(Notifying);
      break;
    case 'queueing':
      pageComponent = React.createElement(Queueing);
      break;
    case 'scheduling':
      pageComponent = React.createElement(Scheduling);
      break;
    case 'searching':
      pageComponent = React.createElement(Searching);
      break;
    case 'workflow':
      pageComponent = React.createElement(Workflow);
      break;
    case 'working':
      pageComponent = React.createElement(Working);
      break;
    case 'swaggerui':
      pageComponent = React.createElement(SwaggerUI);
      break;
    case 'users':
      pageComponent = React.createElement(Users);
      break;
    case 'spaces':
      pageComponent = React.createElement(Spaces);
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