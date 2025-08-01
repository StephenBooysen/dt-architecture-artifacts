class ArchitectureArtifactsExtension {
  constructor() {
    this.serverUrl = 'http://localhost:5000';
    this.currentView = 'search'; // 'search' or 'preview'
    this.debounceTimer = null;
    this.currentUser = null;
    this.isAuthenticated = false;
    
    this.initializeElements();
    this.loadSettings();
    this.bindEvents();
    this.checkAuthStatus();
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
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['serverUrl']);
      if (result.serverUrl) {
        this.serverUrl = result.serverUrl;
        this.serverUrlInput.value = result.serverUrl;
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
        this.showLogin();
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
      const url = `${this.serverUrl}${endpoint}?q=${encodeURIComponent(query)}`;
      
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
      const response = await fetch(`${this.serverUrl}/api/files/${encodeURIComponent(filePath)}`, {
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

  // Enhanced markdown to HTML converter
  markdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    // Code blocks (must be done first)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, (match, lang, code) => {
      const language = lang ? ` class="language-${lang}"` : '';
      return `<pre${language}><code>${this.escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Headers (with anchor support)
    html = html.replace(/^#{6}\s+(.*)$/gim, '<h6>$1</h6>');
    html = html.replace(/^#{5}\s+(.*)$/gim, '<h5>$1</h5>');
    html = html.replace(/^#{4}\s+(.*)$/gim, '<h4>$1</h4>');
    html = html.replace(/^#{3}\s+(.*)$/gim, '<h3>$1</h3>');
    html = html.replace(/^#{2}\s+(.*)$/gim, '<h2>$1</h2>');
    html = html.replace(/^#{1}\s+(.*)$/gim, '<h1>$1</h1>');
    
    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');
    
    // Blockquotes
    html = html.replace(/^>\s+(.*)$/gim, '<blockquote>$1</blockquote>');
    
    // Lists
    html = html.replace(/^\s*\*\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/^\s*-\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/^\s*\+\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<li>$1</li>');
    
    // Wrap consecutive list items
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/gim, '');
    
    // Bold and italic (non-greedy matching)
    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em>$1</em>');
    
    // Strikethrough
    html = html.replace(/~~(.*?)~~/gim, '<s>$1</s>');
    
    // Inline code (after bold/italic to avoid conflicts)
    html = html.replace(/`([^`\n]+)`/gim, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href=\"$2\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>');
    
    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src=\"$2\" alt=\"$1\" style=\"max-width: 100%; height: auto;\">');
    
    // Tables (basic support)
    html = html.replace(/\|(.+)\|/gim, (match, content) => {
      const cells = content.split('|').map(cell => `<td>${cell.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    });
    html = html.replace(/(<tr>.*<\/tr>)/gims, '<table>$1</table>');
    html = html.replace(/<\/table>\s*<table>/gim, '');
    
    // Line breaks (convert double newlines to paragraphs)
    html = html.replace(/\n\n/gim, '</p><p>');
    html = html.replace(/\n/gim, '<br>');
    
    // Wrap in paragraphs
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/gim, '');
    html = html.replace(/<p>\s*<\/p>/gim, '');
    
    return html;
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
        this.hideLogin();
        this.showMessage('Successfully signed in', 'success');
        this.usernameInput.value = '';
        this.passwordInput.value = '';
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
    this.showMessage('Successfully signed out', 'success');
  }

  updateAuthUI() {
    if (this.isAuthenticated && this.currentUser) {
      this.statusText.textContent = this.currentUser.username || 'Signed In';
      this.userStatus.title = 'Click to sign out';
      this.userStatus.classList.add('authenticated');
    } else {
      this.statusText.textContent = 'Sign In';
      this.userStatus.title = 'Click to sign in';
      this.userStatus.classList.remove('authenticated');
    }
  }

  showLogin() {
    this.loginPanel.style.display = 'block';
    this.usernameInput.focus();
  }

  hideLogin() {
    this.loginPanel.style.display = 'none';
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