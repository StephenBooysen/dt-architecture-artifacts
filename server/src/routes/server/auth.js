/**
 * @fileoverview Server authentication routes.
 * Handles landing page, login page, and authentication flows.
 */

const express = require('express');
const { getSharedStyles, getHeader, getNavigation, getFooter } = require('../../templates/htmlTemplates');
const { getThemeToggleScript } = require('../../templates/clientScripts');
const { requireServerAuth } = require('../../middleware/auth');
const router = express.Router();

// Landing page with 3 second delay
router.get('/server-landing', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/server-dashboard');
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Artifacts Server</title>
  ${getSharedStyles()}
  <style>
    .landing-container {
      height: 100vh;
      background: var(--confluence-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .landing-content {
      display: flex;
      align-items: center;
      max-width: 800px;
      width: 100%;
      gap: 3rem;
    }
    .landing-image {
      flex: 0 0 300px;
      max-width: 300px;
    }
    .landing-image img {
      width: 100%;
      height: auto;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .landing-text {
      flex: 1;
      text-align: center;
    }
    @media (max-width: 768px) {
      .landing-content {
        flex-direction: column;
        text-align: center;
        gap: 2rem;
      }
      .landing-image {
        flex: none;
        max-width: 250px;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <div class="landing-container">
      <div class="landing-content">
        <div class="landing-image">
          <img src="/knowledge-repository.webp" alt="Design Repository" />
        </div>
        <div class="landing-text">
          <div class="mb-4">
            <img src="/stech-black.png" alt="Design Artifacts" width="80" height="80" class="mb-4" />
          </div>
          <h1 class="text-confluence-text mb-3">Design Artifacts Server</h1>
          <p class="text-muted">Server administration and monitoring interface</p>
          <div class="mt-4">
            <div class="spinner-border text-primary" role="status" style="width: 2rem; height: 2rem;">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    setTimeout(function() {
      window.location.href = '/server-login';
    }, 3000);
  </script>
  ${getThemeToggleScript()}
</body>
</html>`;
  
  res.send(html);
});

// Server login page
router.get('/server-login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/server-dashboard');
  }
  
  // Check for error messages
  const error = req.query.error;
  let errorMessage = '';
  if (error === 'google_not_configured') {
    errorMessage = 'Google OAuth is not configured. Please use username/password login or contact an administrator.';
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server Login - Design Artifacts</title>
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
          <img src="/stech-black.png" alt="Design Artifacts" width="60" height="60" class="mb-3" />
          <h2 class="server-auth-title">Server Administration</h2>
          <p class="server-auth-subtitle">Please sign in to access the server interface.</p>
        </div>
        
        <form id="loginForm" class="server-auth-form">
          <div id="error-message" class="alert alert-danger d-none"></div>
          ${errorMessage ? `<div class="alert alert-warning">${errorMessage}</div>` : ''}
          
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
        
        ${!errorMessage ? `
        <div class="auth-divider text-center my-3">
          <span class="text-muted">or</span>
        </div>
        
        <button
          type="button"
          class="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center"
          id="googleLoginBtn"
        >
          <i class="bi bi-google me-2"></i>
          Continue with Google
        </button>
        ` : ''}
      </div>
    </div>
  </div>

  <script>
    // Add event listener for Google login button
    document.addEventListener('DOMContentLoaded', function() {
      const googleLoginBtn = document.getElementById('googleLoginBtn');
      if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', function() {
          window.location.href = '/api/auth/google?source=server';
        });
      }
    });
    
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

// Backend index page with navigation overview
router.get('/', (req, res) => {
  // Check if user is authenticated, if so redirect to server dashboard
  if (req.isAuthenticated()) {
    return res.redirect('/server-dashboard');
  }
  
  // For unauthenticated users, redirect to landing page
  res.redirect('/server-landing');
});

module.exports = router;