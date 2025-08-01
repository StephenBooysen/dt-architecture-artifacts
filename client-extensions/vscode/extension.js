const vscode = require('vscode');
const axios = require('axios');

// Authentication Manager
class AuthManager {
    constructor(context) {
        this.context = context;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.serverUrl = 'http://localhost:5000';
        this.authStatusChangedEmitter = new vscode.EventEmitter();
        this.onAuthStatusChanged = this.authStatusChangedEmitter.event;
        
        this.loadSettings();
        this.loadStoredAuth();
    }

    loadSettings() {
        const config = vscode.workspace.getConfiguration('architectureArtifacts');
        this.serverUrl = config.get('serverUrl', 'http://localhost:5000');
    }

    async loadStoredAuth() {
        const storedAuth = await this.context.secrets.get('architectureArtifacts.auth');
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                this.currentUser = authData.user;
                this.isAuthenticated = true;
                this.authStatusChangedEmitter.fire(true);
                
                // Verify the stored auth is still valid
                this.checkAuthStatus();
            } catch (error) {
                console.error('Failed to parse stored auth data:', error);
                await this.clearStoredAuth();
            }
        }
    }

    async storeAuth(user) {
        const authData = { user };
        await this.context.secrets.store('architectureArtifacts.auth', JSON.stringify(authData));
    }

    async clearStoredAuth() {
        await this.context.secrets.delete('architectureArtifacts.auth');
    }

    async login() {
        try {
            const username = await vscode.window.showInputBox({
                prompt: 'Enter your username',
                placeHolder: 'Username',
                ignoreFocusOut: true
            });

            if (!username) {
                return false;
            }

            const password = await vscode.window.showInputBox({
                prompt: 'Enter your password',
                placeHolder: 'Password',
                password: true,
                ignoreFocusOut: true
            });

            if (!password) {
                return false;
            }

            const response = await axios.post(`${this.serverUrl}/api/auth/login`, {
                username,
                password
            }, {
                withCredentials: true,
                timeout: 10000
            });

            if (response.status === 200) {
                const userData = response.data;
                this.currentUser = userData.user || { username };
                this.isAuthenticated = true;
                
                await this.storeAuth(this.currentUser);
                this.authStatusChangedEmitter.fire(true);

                vscode.window.showInformationMessage(`Successfully signed in as ${this.currentUser.username}`);
                return true;
            }
        } catch (error) {
            console.error('Login failed:', error);
            let errorMessage = 'Login failed';
            
            if (error.response?.status === 401) {
                errorMessage = 'Invalid credentials';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Cannot connect to server. Please check your server URL in settings.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            vscode.window.showErrorMessage(`Login failed: ${errorMessage}`);
        }

        return false;
    }

    async logout() {
        try {
            // Try to logout from server
            await axios.post(`${this.serverUrl}/api/auth/logout`, {}, {
                withCredentials: true,
                timeout: 5000
            });
        } catch (error) {
            console.log('Server logout failed (this is okay):', error);
        }

        // Clear local state regardless of server response
        this.currentUser = null;
        this.isAuthenticated = false;
        await this.clearStoredAuth();
        this.authStatusChangedEmitter.fire(false);

        vscode.window.showInformationMessage('Successfully signed out');
    }

    async checkAuthStatus() {
        try {
            const response = await axios.get(`${this.serverUrl}/api/auth/me`, {
                withCredentials: true,
                timeout: 5000
            });

            if (response.status === 200) {
                const userData = response.data;
                this.currentUser = userData.user || userData;
                this.isAuthenticated = true;
                if (this.currentUser) {
                    await this.storeAuth(this.currentUser);
                }
                this.authStatusChangedEmitter.fire(true);
                return true;
            }
        } catch (error) {
            console.log('Auth check failed:', error.message);
            // Clear stored auth if server says we're not authenticated
            if (error.response?.status === 401) {
                await this.clearStoredAuth();
            }
        }

        this.currentUser = null;
        this.isAuthenticated = false;
        this.authStatusChangedEmitter.fire(false);
        return false;
    }

    getUser() {
        return this.currentUser;
    }

    getIsAuthenticated() {
        return this.isAuthenticated;
    }

    getServerUrl() {
        return this.serverUrl;
    }

    updateServerUrl(url) {
        this.serverUrl = url;
        // Clear auth when server URL changes
        this.logout();
    }

    async makeAuthenticatedRequest(url, options = {}) {
        try {
            const response = await axios({
                url: `${this.serverUrl}${url}`,
                withCredentials: true,
                timeout: 10000,
                ...options
            });
            return response;
        } catch (error) {
            if (error.response?.status === 401) {
                // Token expired or invalid, logout
                await this.logout();
                throw new Error('Authentication required. Please sign in again.');
            }
            throw error;
        }
    }
}

// Tree Data Provider
class ArchitectureArtifactsProvider {
    constructor(authManager) {
        this.authManager = authManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        if (!element) {
            // Root elements
            const items = [];

            if (this.authManager.getIsAuthenticated()) {
                const user = this.authManager.getUser();
                items.push(new ArchitectureArtifactsItem(
                    `Signed in as ${user?.username || 'User'}`,
                    vscode.TreeItemCollapsibleState.None,
                    'user',
                    {
                        command: 'architectureArtifacts.logout',
                        title: 'Sign Out',
                        arguments: []
                    }
                ));
                
                items.push(new ArchitectureArtifactsItem(
                    'Search Documentation',
                    vscode.TreeItemCollapsibleState.None,
                    'search',
                    {
                        command: 'architectureArtifacts.search',
                        title: 'Search Documentation',
                        arguments: []
                    }
                ));
            } else {
                items.push(new ArchitectureArtifactsItem(
                    'Sign In Required',
                    vscode.TreeItemCollapsibleState.None,
                    'login',
                    {
                        command: 'architectureArtifacts.login',
                        title: 'Sign In',
                        arguments: []
                    }
                ));
            }

            items.push(new ArchitectureArtifactsItem(
                'Settings',
                vscode.TreeItemCollapsibleState.None,
                'settings',
                {
                    command: 'architectureArtifacts.settings',
                    title: 'Settings',
                    arguments: []
                }
            ));

            return Promise.resolve(items);
        }

        return Promise.resolve([]);
    }
}

class ArchitectureArtifactsItem extends vscode.TreeItem {
    constructor(label, collapsibleState, contextValue, command) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        this.command = command;
        this.tooltip = this.getTooltip();
        this.iconPath = this.getIcon();
    }

    getTooltip() {
        switch (this.contextValue) {
            case 'user':
                return 'Click to sign out';
            case 'search':
                return 'Search architecture documentation';
            case 'login':
                return 'Click to sign in to Architecture Artifacts';
            case 'settings':
                return 'Configure extension settings';
            default:
                return this.label;
        }
    }

    getIcon() {
        switch (this.contextValue) {
            case 'user':
                return new vscode.ThemeIcon('account');
            case 'search':
                return new vscode.ThemeIcon('search');
            case 'login':
                return new vscode.ThemeIcon('sign-in');
            case 'settings':
                return new vscode.ThemeIcon('settings-gear');
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}

// Search Webview
class SearchWebview {
    constructor(context, authManager) {
        this.context = context;
        this.authManager = authManager;
        this.panel = undefined;
    }

    show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'architectureArtifactsSearch',
            'Architecture Artifacts Search',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this.getWebviewContent();

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'search':
                        await this.handleSearch(message.query, message.searchType);
                        break;
                    case 'getFile':
                        await this.handleGetFile(message.filePath);
                        break;
                    case 'checkAuth':
                        await this.handleCheckAuth();
                        break;
                    case 'login':
                        await this.handleLogin();
                        break;
                    case 'logout':
                        await this.handleLogout();
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        // Send initial auth status
        this.sendAuthStatus();
    }

    async handleSearch(query, searchType) {
        if (!this.authManager.getIsAuthenticated()) {
            this.panel?.webview.postMessage({
                command: 'searchError',
                error: 'Authentication required. Please sign in first.'
            });
            return;
        }

        try {
            const endpoint = searchType === 'files' ? '/api/search/files' : '/api/search/content';
            const response = await this.authManager.makeAuthenticatedRequest(
                `${endpoint}?q=${encodeURIComponent(query)}`
            );

            this.panel?.webview.postMessage({
                command: 'searchResults',
                results: response.data,
                query: query
            });
        } catch (error) {
            this.panel?.webview.postMessage({
                command: 'searchError',
                error: error.message || 'Search failed'
            });
        }
    }

    async handleGetFile(filePath) {
        if (!this.authManager.getIsAuthenticated()) {
            this.panel?.webview.postMessage({
                command: 'fileError',
                error: 'Authentication required. Please sign in first.'
            });
            return;
        }

        try {
            const response = await this.authManager.makeAuthenticatedRequest(
                `/api/files/${encodeURIComponent(filePath)}`
            );

            this.panel?.webview.postMessage({
                command: 'fileContent',
                filePath: filePath,
                content: response.data.content || response.data.cleanContent || ''
            });
        } catch (error) {
            this.panel?.webview.postMessage({
                command: 'fileError',
                error: error.message || 'Failed to load file'
            });
        }
    }

    async handleCheckAuth() {
        await this.authManager.checkAuthStatus();
        this.sendAuthStatus();
    }

    async handleLogin() {
        const success = await this.authManager.login();
        if (success) {
            this.sendAuthStatus();
        }
    }

    async handleLogout() {
        await this.authManager.logout();
        this.sendAuthStatus();
    }

    sendAuthStatus() {
        const user = this.authManager.getUser();
        this.panel?.webview.postMessage({
            command: 'authStatus',
            isAuthenticated: this.authManager.getIsAuthenticated(),
            user: user
        });
    }

    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Architecture Artifacts Search</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .logo h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }

        .auth-section {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .auth-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .auth-status.authenticated {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-editor-background);
        }

        .search-section {
            margin-bottom: 20px;
        }

        .search-container {
            display: flex;
            margin-bottom: 10px;
        }

        .search-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px 0 0 4px;
            outline: none;
        }

        .search-input:focus {
            border-color: var(--vscode-focusBorder);
        }

        .search-button {
            padding: 8px 16px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 0 4px 4px 0;
            cursor: pointer;
            outline: none;
        }

        .search-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .search-types {
            display: flex;
            gap: 15px;
        }

        .search-type {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
        }

        .results-section {
            min-height: 200px;
        }

        .loading {
            display: none;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }

        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-progressBar-background);
            border-top: 2px solid var(--vscode-progressBar-foreground);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .results-list {
            display: none;
        }

        .results-count {
            margin-bottom: 10px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .results-section-header {
            font-weight: 600;
            margin: 15px 0 10px 0;
            color: var(--vscode-foreground);
        }

        .result-item {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin-bottom: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .result-item:hover {
            background-color: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-list-hoverBackground);
        }

        .result-header {
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }

        .result-icon {
            font-size: 16px;
            margin-top: 2px;
        }

        .result-info {
            flex: 1;
        }

        .result-title {
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
        }

        .result-path {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }

        .result-snippet {
            font-size: 13px;
            color: var(--vscode-editor-foreground);
            line-height: 1.4;
            margin-top: 8px;
        }

        .result-snippet mark {
            background-color: var(--vscode-editor-findMatchHighlightBackground);
            color: var(--vscode-editor-foreground);
            padding: 1px 2px;
            border-radius: 2px;
        }

        .no-results {
            display: none;
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }

        .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 12px;
            border-radius: 4px;
            margin: 10px 0;
        }

        .preview-section {
            display: none;
            margin-top: 20px;
        }

        .preview-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .back-button {
            padding: 6px 12px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 4px;
            cursor: pointer;
            outline: none;
        }

        .back-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .preview-title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }

        .preview-content {
            padding: 15px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            max-height: 500px;
            overflow-y: auto;
            line-height: 1.6;
        }

        .preview-content h1, .preview-content h2, .preview-content h3,
        .preview-content h4, .preview-content h5, .preview-content h6 {
            color: var(--vscode-foreground);
            margin-top: 20px;
            margin-bottom: 10px;
        }

        .preview-content h1 { font-size: 24px; }
        .preview-content h2 { font-size: 20px; }
        .preview-content h3 { font-size: 18px; }
        .preview-content h4 { font-size: 16px; }
        .preview-content h5 { font-size: 14px; }
        .preview-content h6 { font-size: 12px; }

        .preview-content code {
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }

        .preview-content pre {
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
        }

        .preview-content blockquote {
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            background-color: var(--vscode-textBlockQuote-background);
            margin: 15px 0;
            padding: 10px 15px;
        }

        .preview-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
        }

        .preview-content th, .preview-content td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            text-align: left;
        }

        .preview-content th {
            background-color: var(--vscode-editor-lineHighlightBackground);
            font-weight: 600;
        }

        .auth-required {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }

        .auth-button {
            padding: 8px 16px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 4px;
            cursor: pointer;
            outline: none;
            margin-top: 10px;
        }

        .auth-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <span>📚</span>
            <h1>Architecture Artifacts</h1>
        </div>
        <div class="auth-section">
            <span class="auth-status" id="authStatus">Checking...</span>
            <button class="auth-button" id="authButton" onclick="handleAuth()">Sign In</button>
        </div>
    </div>

    <div id="mainContent" style="display: none;">
        <div class="search-section">
            <div class="search-container">
                <input 
                    type="text" 
                    id="searchInput" 
                    placeholder="Search documentation..." 
                    class="search-input"
                >
                <button id="searchButton" class="search-button" onclick="performSearch()">Search</button>
            </div>
            
            <div class="search-types">
                <label class="search-type">
                    <input type="radio" name="searchType" value="content" checked>
                    <span>Content</span>
                </label>
                <label class="search-type">
                    <input type="radio" name="searchType" value="files">
                    <span>Files</span>
                </label>
            </div>
        </div>

        <div class="results-section" id="resultsSection">
            <div class="loading" id="loadingIndicator">
                <div class="spinner"></div>
                <span>Searching...</span>
            </div>
            
            <div class="results-list" id="resultsList"></div>
            
            <div class="no-results" id="noResults">
                <p>No results found</p>
                <small>Try adjusting your search terms</small>
            </div>
        </div>

        <div class="preview-section" id="previewSection">
            <div class="preview-header">
                <button class="back-button" onclick="showSearchView()">← Back to Results</button>
                <h3 class="preview-title" id="previewTitle"></h3>
            </div>
            <div class="preview-content" id="previewContent"></div>
        </div>
    </div>

    <div id="authRequired" class="auth-required">
        <p>Please sign in to search documentation</p>
        <button class="auth-button" onclick="handleAuth()">Sign In</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let isAuthenticated = false;
        let currentUser = null;

        // Check auth status on load
        vscode.postMessage({ command: 'checkAuth' });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'authStatus':
                    handleAuthStatus(message.isAuthenticated, message.user);
                    break;
                case 'searchResults':
                    handleSearchResults(message.results, message.query);
                    break;
                case 'searchError':
                    handleSearchError(message.error);
                    break;
                case 'fileContent':
                    handleFileContent(message.filePath, message.content);
                    break;
                case 'fileError':
                    handleFileError(message.error);
                    break;
            }
        });

        function handleAuthStatus(authenticated, user) {
            isAuthenticated = authenticated;
            currentUser = user;
            
            const authStatus = document.getElementById('authStatus');
            const authButton = document.getElementById('authButton');
            const mainContent = document.getElementById('mainContent');
            const authRequired = document.getElementById('authRequired');

            if (authenticated) {
                authStatus.textContent = user?.username || 'Signed In';
                authStatus.classList.add('authenticated');
                authButton.textContent = 'Sign Out';
                mainContent.style.display = 'block';
                authRequired.style.display = 'none';
            } else {
                authStatus.textContent = 'Not Signed In';
                authStatus.classList.remove('authenticated');
                authButton.textContent = 'Sign In';
                mainContent.style.display = 'none';
                authRequired.style.display = 'block';
            }
        }

        function handleAuth() {
            if (isAuthenticated) {
                vscode.postMessage({ command: 'logout' });
            } else {
                vscode.postMessage({ command: 'login' });
            }
        }

        function performSearch() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) return;

            const searchType = document.querySelector('input[name="searchType"]:checked').value;
            
            showLoading();
            vscode.postMessage({ 
                command: 'search', 
                query: query, 
                searchType: searchType 
            });
        }

        function handleSearchResults(results, query) {
            hideLoading();
            displayResults(results, query);
        }

        function handleSearchError(error) {
            hideLoading();
            showError(error);
        }

        function displayResults(results, query) {
            const resultsList = document.getElementById('resultsList');
            const noResults = document.getElementById('noResults');
            
            resultsList.innerHTML = '';
            
            if (!results || results.length === 0) {
                noResults.style.display = 'block';
                resultsList.style.display = 'none';
                return;
            }

            noResults.style.display = 'none';
            resultsList.style.display = 'block';

            // Separate results by type
            const fileResults = results.filter(r => r.type === 'file' || r.fileName);
            const contentResults = results.filter(r => r.type === 'content' || r.preview);

            // Results count
            const countDiv = document.createElement('div');
            countDiv.className = 'results-count';
            countDiv.textContent = \`\${results.length} result\${results.length !== 1 ? 's' : ''} found\`;
            resultsList.appendChild(countDiv);

            // File results
            if (fileResults.length > 0) {
                const header = document.createElement('div');
                header.className = 'results-section-header';
                header.innerHTML = \`<strong>File Names (\${fileResults.length})</strong>\`;
                resultsList.appendChild(header);

                fileResults.forEach(result => {
                    resultsList.appendChild(createResultElement(result, query));
                });
            }

            // Content results
            if (contentResults.length > 0) {
                const header = document.createElement('div');
                header.className = 'results-section-header';
                header.innerHTML = \`<strong>Content Matches (\${contentResults.length})</strong>\`;
                resultsList.appendChild(header);

                contentResults.forEach(result => {
                    resultsList.appendChild(createResultElement(result, query));
                });
            }
        }

        function createResultElement(result, query) {
            const div = document.createElement('div');
            div.className = 'result-item';
            
            const title = result.fileName || result.filePath || 'Untitled';
            const path = result.filePath || result.fileName || '';
            const snippet = result.preview || '';
            
            const icon = getFileIcon(title);
            const highlightedSnippet = highlightSearchTerms(snippet, query);
            const highlightedTitle = highlightSearchTerms(title, query);
            
            div.innerHTML = \`
                <div class="result-header">
                    <div class="result-icon">\${icon}</div>
                    <div class="result-info">
                        <div class="result-title">\${highlightedTitle}</div>
                        <div class="result-path">\${escapeHtml(path)}</div>
                    </div>
                </div>
                \${snippet ? \`<div class="result-snippet">\${highlightedSnippet}</div>\` : ''}
            \`;

            div.addEventListener('click', () => {
                showPreview(result);
            });

            return div;
        }

        function getFileIcon(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            switch (ext) {
                case 'md': return '📄';
                case 'pdf': return '📕';
                case 'txt': return '📝';
                case 'json': return '🔧';
                case 'js':
                case 'ts': return '⚡';
                case 'html': return '🌐';
                case 'css': return '🎨';
                case 'png':
                case 'jpg':
                case 'jpeg':
                case 'gif': return '🖼️';
                default: return '📄';
            }
        }

        function highlightSearchTerms(text, query) {
            if (!text || !query) return escapeHtml(text);

            const escapedText = escapeHtml(text);
            const terms = query.toLowerCase().split(/\\s+/).filter(term => term.length > 0);
            
            let highlightedText = escapedText;
            terms.forEach(term => {
                const regex = new RegExp(\`(\${escapeRegex(term)})\`, 'gi');
                highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
            });

            return highlightedText;
        }

        function showPreview(result) {
            const filePath = result.filePath || result.fileName;
            document.getElementById('previewTitle').textContent = filePath || 'Preview';
            
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('previewSection').style.display = 'block';
            
            vscode.postMessage({ 
                command: 'getFile', 
                filePath: filePath 
            });
        }

        function showSearchView() {
            document.getElementById('previewSection').style.display = 'none';
            document.getElementById('resultsSection').style.display = 'block';
        }

        function handleFileContent(filePath, content) {
            const previewContent = document.getElementById('previewContent');
            const htmlContent = markdownToHtml(content);
            previewContent.innerHTML = htmlContent;
        }

        function handleFileError(error) {
            const previewContent = document.getElementById('previewContent');
            previewContent.innerHTML = \`
                <div style="color: var(--vscode-errorForeground); text-align: center; padding: 20px;">
                    <p>Failed to load preview</p>
                    <small>\${error}</small>
                </div>
            \`;
        }

        function markdownToHtml(markdown) {
            if (!markdown) return '';
            
            let html = markdown;
            
            // Code blocks (must be done first)
            html = html.replace(/\`\`\`(\\w+)?\\n([\\s\\S]*?)\`\`\`/gim, (match, lang, code) => {
                const language = lang ? \` class="language-\${lang}"\` : '';
                return \`<pre\${language}><code>\${escapeHtml(code.trim())}</code></pre>\`;
            });
            
            // Headers
            html = html.replace(/^#{6}\\s+(.*)$/gim, '<h6>$1</h6>');
            html = html.replace(/^#{5}\\s+(.*)$/gim, '<h5>$1</h5>');
            html = html.replace(/^#{4}\\s+(.*)$/gim, '<h4>$1</h4>');
            html = html.replace(/^#{3}\\s+(.*)$/gim, '<h3>$1</h3>');
            html = html.replace(/^#{2}\\s+(.*)$/gim, '<h2>$1</h2>');
            html = html.replace(/^#{1}\\s+(.*)$/gim, '<h1>$1</h1>');
            
            // Horizontal rules
            html = html.replace(/^---$/gim, '<hr>');
            html = html.replace(/^\\*\\*\\*$/gim, '<hr>');
            
            // Blockquotes
            html = html.replace(/^>\\s+(.*)$/gim, '<blockquote>$1</blockquote>');
            
            // Lists
            html = html.replace(/^\\s*\\*\\s+(.*)$/gim, '<li>$1</li>');
            html = html.replace(/^\\s*-\\s+(.*)$/gim, '<li>$1</li>');
            html = html.replace(/^\\s*\\+\\s+(.*)$/gim, '<li>$1</li>');
            html = html.replace(/^\\s*\\d+\\.\\s+(.*)$/gim, '<li>$1</li>');
            
            // Wrap consecutive list items
            html = html.replace(/(<li>.*<\\/li>)/gims, '<ul>$1</ul>');
            html = html.replace(/<\\/ul>\\s*<ul>/gim, '');
            
            // Bold and italic
            html = html.replace(/\\*\\*\\*(.*?)\\*\\*\\*/gim, '<strong><em>$1</em></strong>');
            html = html.replace(/\\*\\*(.*?)\\*\\*/gim, '<strong>$1</strong>');
            html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');
            html = html.replace(/\\*(.*?)\\*/gim, '<em>$1</em>');
            html = html.replace(/_(.*?)_/gim, '<em>$1</em>');
            
            // Strikethrough
            html = html.replace(/~~(.*?)~~/gim, '<s>$1</s>');
            
            // Inline code
            html = html.replace(/\`([^\`\\n]+)\`/gim, '<code>$1</code>');
            
            // Links
            html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/gim, '<a href="$2" target="_blank">$1</a>');
            
            // Images
            html = html.replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');
            
            // Line breaks
            html = html.replace(/\\n\\n/gim, '</p><p>');
            html = html.replace(/\\n/gim, '<br>');
            
            // Wrap in paragraphs
            if (!html.startsWith('<')) {
                html = '<p>' + html + '</p>';
            }
            
            // Clean up empty paragraphs
            html = html.replace(/<p><\\/p>/gim, '');
            html = html.replace(/<p>\\s*<\\/p>/gim, '');
            
            return html;
        }

        function showLoading() {
            document.getElementById('loadingIndicator').style.display = 'flex';
            document.getElementById('resultsList').style.display = 'none';
            document.getElementById('noResults').style.display = 'none';
        }

        function hideLoading() {
            document.getElementById('loadingIndicator').style.display = 'none';
            document.getElementById('resultsList').style.display = 'block';
        }

        function showError(error) {
            hideLoading();
            const resultsList = document.getElementById('resultsList');
            resultsList.innerHTML = \`
                <div class="error-message">
                    <p>\${error}</p>
                    <small>Check your connection and authentication status</small>
                </div>
            \`;
            resultsList.style.display = 'block';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function escapeRegex(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        // Enter key search
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });

        // Search type change
        document.querySelectorAll('input[name="searchType"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const query = document.getElementById('searchInput').value.trim();
                if (query) {
                    performSearch();
                }
            });
        });
    </script>
</body>
</html>`;
    }
}

// Settings Manager
class SettingsManager {
    constructor(context, authManager) {
        this.context = context;
        this.authManager = authManager;
    }

    show() {
        const config = vscode.workspace.getConfiguration('architectureArtifacts');
        const currentServerUrl = config.get('serverUrl', 'http://localhost:5000');
        const currentAutoLogin = config.get('autoLogin', false);

        vscode.window.showQuickPick([
            {
                label: '$(globe) Server URL',
                description: currentServerUrl,
                detail: 'Configure the Architecture Artifacts server URL'
            },
            {
                label: '$(sign-in) Auto Login',
                description: currentAutoLogin ? 'Enabled' : 'Disabled',
                detail: 'Automatically check authentication status on startup'
            },
            {
                label: '$(refresh) Test Connection',
                description: 'Test connection to the server',
                detail: 'Verify that the server is accessible'
            },
            {
                label: '$(info) About',
                description: 'Architecture Artifacts Extension',
                detail: 'Version 1.0.0'
            }
        ], {
            title: 'Architecture Artifacts Settings',
            placeHolder: 'Choose a setting to configure'
        }).then(async (selection) => {
            if (!selection) return;

            switch (selection.label) {
                case '$(globe) Server URL':
                    await this.configureServerUrl();
                    break;
                case '$(sign-in) Auto Login':
                    await this.configureAutoLogin();
                    break;
                case '$(refresh) Test Connection':
                    await this.testConnection();
                    break;
                case '$(info) About':
                    this.showAbout();
                    break;
            }
        });
    }

    async configureServerUrl() {
        const config = vscode.workspace.getConfiguration('architectureArtifacts');
        const currentUrl = config.get('serverUrl', 'http://localhost:5000');

        const newUrl = await vscode.window.showInputBox({
            title: 'Architecture Artifacts Server URL',
            prompt: 'Enter the server URL (e.g., http://localhost:5000)',
            value: currentUrl,
            validateInput: (value) => {
                if (!value) {
                    return 'Server URL is required';
                }
                try {
                    new URL(value);
                    return null;
                } catch {
                    return 'Please enter a valid URL';
                }
            }
        });

        if (newUrl && newUrl !== currentUrl) {
            try {
                await config.update('serverUrl', newUrl, vscode.ConfigurationTarget.Global);
                this.authManager.updateServerUrl(newUrl);
                
                vscode.window.showInformationMessage(
                    `Server URL updated to: ${newUrl}`,
                    'Test Connection'
                ).then((action) => {
                    if (action === 'Test Connection') {
                        this.testConnection();
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage('Failed to update server URL');
            }
        }
    }

    async configureAutoLogin() {
        const config = vscode.workspace.getConfiguration('architectureArtifacts');
        const currentValue = config.get('autoLogin', false);

        const newValue = await vscode.window.showQuickPick([
            {
                label: 'Enable',
                description: 'Automatically check authentication on startup',
                picked: currentValue
            },
            {
                label: 'Disable',
                description: 'Manual authentication only',
                picked: !currentValue
            }
        ], {
            title: 'Auto Login Setting',
            placeHolder: 'Choose auto login behavior'
        });

        if (newValue) {
            const enableAutoLogin = newValue.label === 'Enable';
            
            if (enableAutoLogin !== currentValue) {
                try {
                    await config.update('autoLogin', enableAutoLogin, vscode.ConfigurationTarget.Global);
                    vscode.window.showInformationMessage(
                        `Auto login ${enableAutoLogin ? 'enabled' : 'disabled'}`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage('Failed to update auto login setting');
                }
            }
        }
    }

    async testConnection() {
        const serverUrl = this.authManager.getServerUrl();
        
        try {
            const response = await fetch(`${serverUrl}/api/auth/me`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok || response.status === 401) {
                // 401 is expected if not authenticated, but means server is reachable
                vscode.window.showInformationMessage(
                    `✅ Successfully connected to server at ${serverUrl}`,
                    response.ok ? 'Sign Out' : 'Sign In'
                ).then((action) => {
                    if (action === 'Sign In') {
                        this.authManager.login();
                    } else if (action === 'Sign Out') {
                        this.authManager.logout();
                    }
                });
            } else {
                throw new Error(`Server responded with status: ${response.status}`);
            }
        } catch (error) {
            let errorMessage = 'Connection test failed';
            
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                errorMessage = 'Connection timeout - server may be unavailable';
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Connection refused - server may not be running';
            } else if (error.message) {
                errorMessage = error.message;
            }

            vscode.window.showErrorMessage(
                `❌ ${errorMessage}`,
                'Check Settings',
                'Retry'
            ).then((action) => {
                if (action === 'Check Settings') {
                    this.configureServerUrl();
                } else if (action === 'Retry') {
                    this.testConnection();
                }
            });
        }
    }

    showAbout() {
        const aboutMessage = `Architecture Artifacts VS Code Extension

Version: 1.0.0
Description: Search and preview architecture documentation from your Architecture Artifacts server directly in VS Code

Features:
• 🔍 Search documentation content and file names
• 📖 Preview markdown files with syntax highlighting
• 🔐 Secure authentication with session management
• ⚙️ Configurable server settings
• 🎨 VS Code theme integration

Commands:
• Architecture Artifacts: Search Documentation
• Architecture Artifacts: Sign In/Out
• Architecture Artifacts: Settings

Created for seamless integration with the Architecture Artifacts platform.`;

        vscode.window.showInformationMessage(
            aboutMessage,
            { modal: true },
            'Open Documentation',
            'Report Issue'
        ).then((action) => {
            if (action === 'Open Documentation') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo/architecture-artifacts'));
            } else if (action === 'Report Issue') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo/architecture-artifacts/issues'));
            }
        });
    }
}

// Global variables
let authManager;
let searchWebview;
let settingsManager;

function activate(context) {
    console.log('Architecture Artifacts extension is now active!');

    // Initialize managers
    authManager = new AuthManager(context);
    searchWebview = new SearchWebview(context, authManager);
    settingsManager = new SettingsManager(context, authManager);

    // Create tree data provider
    const provider = new ArchitectureArtifactsProvider(authManager);
    vscode.window.createTreeView('architectureArtifactsExplorer', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    // Register commands
    const commands = [
        vscode.commands.registerCommand('architectureArtifacts.search', () => {
            searchWebview.show();
        }),

        vscode.commands.registerCommand('architectureArtifacts.login', async () => {
            await authManager.login();
        }),

        vscode.commands.registerCommand('architectureArtifacts.logout', async () => {
            await authManager.logout();
        }),

        vscode.commands.registerCommand('architectureArtifacts.settings', () => {
            settingsManager.show();
        }),

        vscode.commands.registerCommand('architectureArtifacts.refresh', () => {
            provider.refresh();
        })
    ];

    // Register all commands
    commands.forEach(command => context.subscriptions.push(command));

    // Auto-check authentication on startup if enabled
    const config = vscode.workspace.getConfiguration('architectureArtifacts');
    if (config.get('autoLogin', false)) {
        authManager.checkAuthStatus();
    }

    // Update context when authentication changes
    authManager.onAuthStatusChanged((isAuthenticated) => {
        vscode.commands.executeCommand('setContext', 'architectureArtifacts.authenticated', isAuthenticated);
        provider.refresh();
    });

    vscode.window.showInformationMessage('Architecture Artifacts extension loaded successfully!');
}

function deactivate() {
    console.log('Architecture Artifacts extension is now deactivated.');
}

module.exports = {
    activate,
    deactivate
};