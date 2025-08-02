import React from 'react';

const Settings = () => {
  return (
    <>
      <div className="content-header">
        <h1>Settings</h1>
        <p>System configuration and management</p>
      </div>
      
      <div className="settings-section">
        <div className="settings-card">
          <h2>Configuration</h2>
          <p className="settings-description">
            Repository and filing settings are now managed through the <a href="/spaces">Spaces</a> configuration.
          </p>
          
          <div className="settings-info">
            <h3>Available Settings</h3>
            <ul>
              <li><strong>User Management:</strong> Configure users and permissions via <a href="/users">Users</a></li>
              <li><strong>Space Configuration:</strong> Set up repositories and filing providers via <a href="/spaces">Spaces</a></li>
              <li><strong>Service Monitoring:</strong> Monitor system services via the Services section</li>
            </ul>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
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

        .settings-info {
          margin-top: 2rem;
        }

        .settings-info h3 {
          color: #172b4d;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .settings-info ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .settings-info li {
          margin-bottom: 0.75rem;
          color: #5e6c84;
          line-height: 1.5;
        }

        .settings-info li strong {
          color: #172b4d;
        }

        .settings-info a {
          color: #0052cc;
          text-decoration: none;
        }

        .settings-info a:hover {
          text-decoration: underline;
        }
      `}} />
    </>
  );
};

export default Settings;