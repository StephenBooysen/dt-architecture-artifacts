/**
 * @fileoverview Google Chrome extension popup interface
 * 
 * Provides Chrome extension functionality for Architecture Artifacts including:
 * - Search interface and file preview
 * - User authentication and session management
 * - Space selection and workspace integration
 * - Direct integration with Architecture Artifacts server
 * - Chrome-specific API utilization
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

class ArchitectureArtifactsExtension {
  constructor() {
    this.serverUrl = 'http://localhost:5000';
    this.currentView = 'search'; // 'search' or 'preview'
    this.debounceTimer = null;
    this.currentUser = null;
    this.isAuthenticated = false;
    this.spaces = [];
    this.currentSpace = null;
    this.initialAuthCheckComplete = false;
    
    this.initializeElements();
    this.loadSettings();
    this.bindEvents();
    this.initializeApp();
  }

  initializeElements() {
    // Search elements
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.resultsSection = document.getElementById('resultsSection');
    this.resultsList = document.getElementById('resultsList');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.noResults = document.getElementById('noResults');
    
    // Preview elements
    this.previewSection = document.getElementById('previewSection');
    this.previewTitle = document.getElementById('previewTitle');
    this.previewContent = document.getElementById('previewContent');
    this.backBtn = document.getElementById('backBtn');
    
    // Auth elements
    this.userStatus = document.getElementById('userStatus');
    this.statusText = document.getElementById('statusText');
    this.loginPanel = document.getElementById('loginPanel');
    this.closeLoginBtn = document.getElementById('closeLoginBtn');
    this.usernameInput = document.getElementById('username');
    this.passwordInput = document.getElementById('password');
    this.loginBtn = document.getElementById('loginBtn');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.authStatus = document.getElementById('authStatus');
    
    // Settings elements
    this.settingsBtn = document.getElementById('settingsBtn');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.serverUrlInput = document.getElementById('serverUrl');
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    
    // Spaces elements
    this.spacesSection = document.getElementById('spacesSection');
    this.spaceSelect = document.getElementById('spaceSelect');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['serverUrl', 'currentSpace']);
      if (result.serverUrl) {
        this.serverUrl = result.serverUrl;
        this.serverUrlInput.value = result.serverUrl;
      }
      if (result.currentSpace) {
        this.currentSpace = result.currentSpace;
      }
    } catch (error) {
      console.log('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    const url = this.serverUrlInput.value.trim();
    if (!url) return;

    try {
      await chrome.storage.sync.set({ serverUrl: url });
      this.serverUrl = url;
      this.showMessage('Settings saved successfully', 'success');
      this.hideSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('Failed to save settings', 'error');
    }
  }

  bindEvents() {
    // Search events
    this.searchInput.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.performSearch();
      }, 300);
    });

    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performSearch();
      }
    });

    this.searchBtn.addEventListener('click', () => {
      this.performSearch();
    });

    // Search type radio buttons
    document.querySelectorAll('input[name="searchType"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (this.searchInput.value.trim()) {
          this.performSearch();
        }
      });
    });

    // Preview events
    this.backBtn.addEventListener('click', () => {
      this.showSearchView();
    });

    // Auth events
    this.userStatus.addEventListener('click', () => {
      if (this.isAuthenticated) {
        this.performLogout();
      } else {
        this.showLoginInterface();
      }
    });

    this.closeLoginBtn.addEventListener('click', () => {
      this.hideLogin();
    });

    this.loginBtn.addEventListener('click', () => {
      this.performLogin();
    });

    this.logoutBtn.addEventListener('click', () => {
      this.performLogout();
    });

    // Google Login button
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', () => {
        this.performGoogleLogin();
      });
    }

    this.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performLogin();
      }
    });

    // Settings events
    this.settingsBtn.addEventListener('click', () => {
      this.showSettings();
    });

    this.closeSettingsBtn.addEventListener('click', () => {
      this.hideSettings();
    });

    this.saveSettingsBtn.addEventListener('click', () => {
      this.saveSettings();
    });

    // Spaces events
    this.spaceSelect.addEventListener('change', () => {
      this.handleSpaceChange();
    });

    // Focus search input on load
    this.searchInput.focus();
  }

  async performSearch() {
    const query = this.searchInput.value.trim();
    if (!query) {
      this.clearResults();
      return;
    }

    const searchType = document.querySelector('input[name="searchType"]:checked').value;
    
    this.showLoading();
    
    try {
      const endpoint = searchType === 'files' ? '/api/search/files' : '/api/search/content';
      let url = `${this.serverUrl}${endpoint}?q=${encodeURIComponent(query)}`;
      
      // Add space parameter if a space is selected
      if (this.currentSpace) {
        url += `&space=${encodeURIComponent(this.currentSpace)}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include' // Include cookies for authentication
      });
      
      if (response.status === 401) {
        this.showError('Authentication required. Please log in to your Architecture Artifacts server.');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const results = await response.json();
      this.displayResults(results, query);
      
    } catch (error) {
      console.error('Search failed:', error);
      this.showError('Failed to search. Please check your server connection.');
    } finally {
      this.hideLoading();
    }
  }

  displayResults(results, query) {
    this.clearResults();

    if (!results || results.length === 0) {
      this.showNoResults();
      return;
    }

    // Separate results by type
    const fileResults = results.filter(r => r.type === 'file' || r.fileName);
    const contentResults = results.filter(r => r.type === 'content' || r.preview);

    // Show results count
    const totalCount = results.length;
    const countElement = document.createElement('div');
    countElement.className = 'results-count';
    countElement.innerHTML = `<small>${totalCount} result${totalCount !== 1 ? 's' : ''} found</small>`;
    this.resultsList.appendChild(countElement);

    // Display file results if any
    if (fileResults.length > 0) {
      const fileHeader = document.createElement('div');
      fileHeader.className = 'results-section-header';
      fileHeader.innerHTML = `<strong>File Names (${fileResults.length})</strong>`;
      this.resultsList.appendChild(fileHeader);

      fileResults.forEach(result => {
        const resultElement = this.createResultElement(result, query, 'file');
        this.resultsList.appendChild(resultElement);
      });
    }

    // Display content results if any
    if (contentResults.length > 0) {
      const contentHeader = document.createElement('div');
      contentHeader.className = 'results-section-header';
      contentHeader.innerHTML = `<strong>Content Matches (${contentResults.length})</strong>`;
      this.resultsList.appendChild(contentHeader);

      contentResults.forEach(result => {
        const resultElement = this.createResultElement(result, query, 'content');
        this.resultsList.appendChild(resultElement);
      });
    }
  }

  createResultElement(result, query, type) {
    const div = document.createElement('div');
    div.className = 'result-item';
    
    const title = result.fileName || result.filePath || 'Untitled';
    const path = result.filePath || result.fileName || '';
    const snippet = result.preview || '';
    
    // Add file type icon
    const fileIcon = this.getFileIcon(title);
    
    // Highlight search terms
    const highlightedSnippet = this.highlightSearchTerms(snippet, query);
    const highlightedTitle = this.highlightSearchTerms(title, query);
    
    div.innerHTML = `
      <div class="result-header">
        <div class="result-icon">${fileIcon}</div>
        <div class="result-info">
          <div class="result-title">${highlightedTitle}</div>
          <div class="result-path">${this.escapeHtml(path)}</div>
        </div>
      </div>
      ${snippet ? `<div class="result-snippet">${highlightedSnippet}</div>` : ''}
    `;

    div.addEventListener('click', () => {
      this.showPreview(result);
    });

    return div;
  }

  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'md':
        return '📄';
      case 'pdf':
        return '📕';
      case 'txt':
        return '📝';
      case 'json':
        return '🔧';
      case 'js':
      case 'ts':
        return '⚡';
      case 'html':
        return '🌐';
      case 'css':
        return '🎨';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return '🖼️';
      default:
        return '📄';
    }
  }

  highlightSearchTerms(text, query) {
    if (!text || !query) return this.escapeHtml(text);

    const escapedText = this.escapeHtml(text);
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    let highlightedText = escapedText;
    terms.forEach(term => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    return highlightedText;
  }

  async showPreview(result) {
    this.showPreviewView();
    
    const filePath = result.filePath || result.fileName;
    this.previewTitle.textContent = filePath || 'Preview';
    
    try {
      // Fetch full file content
      let url = `${this.serverUrl}/api/files/${encodeURIComponent(filePath)}`;
      
      // Add space parameter if a space is selected
      if (this.currentSpace) {
        url = `${this.serverUrl}/api/${encodeURIComponent(this.currentSpace)}/files/${encodeURIComponent(filePath)}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include' // Include cookies for authentication
      });
      
      if (response.status === 401) {
        this.previewContent.innerHTML = `
          <div style="color: #de350b; padding: 20px; text-align: center;">
            <p>Authentication required</p>
            <small>Please log in to your Architecture Artifacts server</small>
          </div>
        `;
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      
      const fileData = await response.json();
      const content = fileData.content || '';
      
      // Convert markdown to HTML
      const htmlContent = this.markdownToHtml(content);
      this.previewContent.innerHTML = htmlContent;
      
    } catch (error) {
      console.error('Failed to load preview:', error);
      this.previewContent.innerHTML = `
        <div style="color: #de350b; padding: 20px; text-align: center;">
          <p>Failed to load preview</p>
          <small>${error.message}</small>
        </div>
      `;
    }
  }

  // Simple markdown to HTML converter
  markdownToHtml(markdown) {
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/__(.*?)__/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/_(.*?)_/gim, '<em>$1</em>')
      // Code blocks
      .replace(/```([\\s\\S]*?)```/gim, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]*)`/gim, '<code>$1</code>')
      // Links
      //.replace(/\\[([^\\]]+)\\]\\(([^\\)]+)\\)/gim, '<a href="$2" target="_blank">$1</a>')
      // Line breaks
      .replace(/\\n/gim, '<br>');
  }

  showSearchView() {
    this.currentView = 'search';
    this.previewSection.style.display = 'none';
    this.resultsSection.style.display = 'block';
  }

  showPreviewView() {
    this.currentView = 'preview';
    this.resultsSection.style.display = 'none';
    this.previewSection.style.display = 'block';
  }

  showSettings() {
    this.settingsPanel.style.display = 'block';
  }

  hideSettings() {
    this.settingsPanel.style.display = 'none';
  }

  async initializeApp() {
    // Show loading state initially
    this.showInitialLoading();
    
    try {
      await this.checkAuthStatus();
      this.initialAuthCheckComplete = true;
      
      if (this.isAuthenticated) {
        this.showMainInterface();
        await this.loadSpaces();
      } else {
        this.showLoginInterface();
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showLoginInterface();
    }
  }

  async checkAuthStatus() {
    try {
      const response = await fetch(`${this.serverUrl}/api/auth/me`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        this.currentUser = userData;
        this.isAuthenticated = true;
        this.updateAuthUI();
      } else {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.updateAuthUI();
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      this.currentUser = null;
      this.isAuthenticated = false;
      this.updateAuthUI();
    }
  }

  async loadSpaces() {
    if (!this.isAuthenticated) {
      this.spacesSection.style.display = 'none';
      return;
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/auth/user-spaces`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        this.spaces = await response.json();
        this.updateSpacesUI();
        this.spacesSection.style.display = 'block';
      } else {
        this.spacesSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to load spaces:', error);
      this.spacesSection.style.display = 'none';
    }
  }

  updateSpacesUI() {
    this.spaceSelect.innerHTML = '';
    
    if (this.spaces.length === 0) {
      this.spaceSelect.innerHTML = '<option value="">No spaces available</option>';
      return;
    }

    // Add spaces as options
    this.spaces.forEach(space => {
      const option = document.createElement('option');
      option.value = space.space;
      option.textContent = `${space.space} (${space.access})`;
      this.spaceSelect.appendChild(option);
    });

    // Set current space or default to first space
    if (this.currentSpace && this.spaces.find(s => s.space === this.currentSpace)) {
      this.spaceSelect.value = this.currentSpace;
    } else if (this.spaces.length > 0) {
      // Default to Personal space if available, otherwise first space
      const personalSpace = this.spaces.find(s => s.space === 'Personal');
      this.currentSpace = personalSpace ? personalSpace.space : this.spaces[0].space;
      this.spaceSelect.value = this.currentSpace;
      this.saveCurrentSpace();
    }
  }

  async handleSpaceChange() {
    this.currentSpace = this.spaceSelect.value;
    await this.saveCurrentSpace();
    
    // Clear search results when switching spaces
    this.clearResults();
    this.searchInput.value = '';
  }

  async saveCurrentSpace() {
    try {
      await chrome.storage.sync.set({ currentSpace: this.currentSpace });
    } catch (error) {
      console.error('Failed to save current space:', error);
    }
  }

  async performLogin() {
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value.trim();
    
    if (!username || !password) {
      this.showAuthMessage('Please enter both username and password', 'error');
      return;
    }

    this.loginBtn.disabled = true;
    this.loginBtn.textContent = 'Signing in...';
    
    try {
      const response = await fetch(`${this.serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        const userData = await response.json();
        this.currentUser = userData;
        this.isAuthenticated = true;
        this.updateAuthUI();
        
        // Clear form
        this.usernameInput.value = '';
        this.passwordInput.value = '';
        
        // Show main interface and load spaces
        this.showMainInterface();
        await this.loadSpaces();
        this.showMessage('Successfully signed in', 'success');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        this.showAuthMessage(errorData.message || 'Invalid credentials', 'error');
      }
    } catch (error) {
      console.error('Login failed:', error);
      this.showAuthMessage('Network error. Please check your connection.', 'error');
    } finally {
      this.loginBtn.disabled = false;
      this.loginBtn.textContent = 'Sign In';
    }
  }

  async performGoogleLogin() {
    try {
      // Open Google OAuth in a new tab
      const authUrl = `${this.serverUrl}/api/auth/google?source=client`;
      chrome.tabs.create({ url: authUrl });
    } catch (error) {
      console.error('Google login failed:', error);
      this.showAuthMessage('Failed to initiate Google login', 'error');
    }
  }

  async performLogout() {
    try {
      await fetch(`${this.serverUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.log('Logout request failed:', error);
    }
    
    this.currentUser = null;
    this.isAuthenticated = false;
    this.updateAuthUI();
    this.showLoginInterface();
    this.showMessage('Successfully signed out', 'success');
  }

  updateAuthUI() {
    if (this.isAuthenticated && this.currentUser) {
      this.statusText.textContent = this.currentUser.username || 'Signed In';
      this.userStatus.title = 'Click to sign out';
      this.userStatus.classList.add('authenticated');
      this.loadSpaces();
    } else {
      this.statusText.textContent = 'Sign In';
      this.userStatus.title = 'Click to sign in';
      this.userStatus.classList.remove('authenticated');
      this.spacesSection.style.display = 'none';
    }
  }

  showLogin() {
    this.showLoginInterface();
  }

  hideLogin() {
    // Only hide login panel if we're authenticated
    if (this.isAuthenticated) {
      this.showMainInterface();
    } else {
      this.loginPanel.style.display = 'none';
    }
    this.authStatus.innerHTML = '';
  }

  showAuthMessage(message, type = 'info') {
    const color = type === 'error' ? '#de350b' : type === 'success' ? '#36b37e' : '#6b778c';
    this.authStatus.innerHTML = `
      <div style="padding: 8px; margin-top: 8px; color: ${color}; font-size: 12px; text-align: center;">
        ${message}
      </div>
    `;
  }

  showLoading() {
    this.loadingIndicator.style.display = 'flex';
    this.resultsList.style.display = 'none';
    this.noResults.style.display = 'none';
  }

  hideLoading() {
    this.loadingIndicator.style.display = 'none';
    this.resultsList.style.display = 'block';
  }

  showNoResults() {
    this.noResults.style.display = 'block';
    this.resultsList.style.display = 'none';
  }

  clearResults() {
    this.resultsList.innerHTML = '';
    this.noResults.style.display = 'none';
    this.loadingIndicator.style.display = 'none';
    this.resultsList.style.display = 'block';
  }

  showError(message) {
    this.resultsList.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #de350b;">
        <p>${message}</p>
        <small>Check your settings and server connection</small>
      </div>
    `;
  }

  showMessage(message, type = 'info') {
    // Simple toast-like notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 12px 16px;
      background: ${type === 'success' ? '#36b37e' : '#de350b'};
      color: white;
      border-radius: 6px;
      font-size: 13px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }

  showInitialLoading() {
    // Hide all main sections
    this.hideAllSections();
    
    // Show a loading message in the main area
    this.resultsSection.style.display = 'block';
    this.resultsList.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center;">
        <div class="spinner" style="margin-bottom: 16px;"></div>
        <p style="margin: 0; color: #6b778c;">Checking authentication...</p>
      </div>
    `;
  }

  showLoginInterface() {
    this.hideAllSections();
    this.loginPanel.style.display = 'block';
    this.usernameInput.focus();
  }

  showMainInterface() {
    this.hideAllSections();
    this.resultsSection.style.display = 'block';
    this.clearResults();
    this.searchInput.focus();
  }

  hideAllSections() {
    this.resultsSection.style.display = 'none';
    this.previewSection.style.display = 'none';
    this.loginPanel.style.display = 'none';
    this.settingsPanel.style.display = 'none';
  }
}

// Initialize the extension when the popup loads
document.addEventListener('DOMContentLoaded', () => {
  new ArchitectureArtifactsExtension();
});

// Add slide-in animation for toast messages
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);