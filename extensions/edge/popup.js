class ArchitectureArtifactsExtension {
  constructor() {
    this.serverUrl = 'http://localhost:5000';
    this.currentView = 'search'; // 'search' or 'preview'
    this.debounceTimer = null;
    
    this.initializeElements();
    this.loadSettings();
    this.bindEvents();
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

    results.forEach(result => {
      const resultElement = this.createResultElement(result, query);
      this.resultsList.appendChild(resultElement);
    });
  }

  createResultElement(result, query) {
    const div = document.createElement('div');
    div.className = 'result-item';
    
       const title = result.fileName || result.filePath || 'Untitled';
    const path = result.filePath || result.fileName || '';
    const snippet = result.preview || '';
    
    // Highlight search terms
    const highlightedSnippet = this.highlightSearchTerms(snippet, query);
    
    div.innerHTML = `
      <div class="result-title">${this.escapeHtml(title)}</div>
      <div class="result-path">${this.escapeHtml(path)}</div>
      <div class="result-snippet">${highlightedSnippet}</div>
    `;

    div.addEventListener('click', () => {
      this.showPreview(result);
    });

    return div;
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