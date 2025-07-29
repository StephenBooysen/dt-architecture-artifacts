import React from 'react';

const Settings = () => {
  return (
    <>
      <div className="content-header">
        <h1>Settings</h1>
        <p>Configure your repository and system settings</p>
      </div>
      
      <div className="settings-section">
        <div className="settings-card">
          <h2>Git Repository</h2>
          <p className="settings-description">
            Manage your Git repository connection and operations
          </p>
          
          <form id="cloneForm" className="settings-form">
            <h3>Clone Repository</h3>
            <div className="form-group">
              <label htmlFor="repo-url">Repository URL:</label>
              <input
                id="repo-url"
                type="url"
                placeholder="https://github.com/username/repository.git"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="branch">Branch:</label>
              <input
                id="branch"
                type="text"
                defaultValue="main"
                placeholder="main"
              />
            </div>
            
            <button type="submit" className="btn btn-primary">
              Clone Repository
            </button>
          </form>

          <div className="settings-actions">
            <h3>Repository Actions</h3>
            <button id="pullBtn" className="btn btn-secondary">
              Pull Latest Changes
            </button>
          </div>
        </div>
      </div>
      
      <script dangerouslySetInnerHTML={{__html: `
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
      `}} />
      
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
      `}} />
    </>
  );
};

export default Settings;