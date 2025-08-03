const vscode = require('vscode');
const axios = require('axios');
const markdownit = require('markdown-it');

// Authentication Manager
class AuthManager {
    constructor(context) {
        this.context = context;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.sessionToken = null;
        this.spaces = [];
        this.currentSpace = null;
        this.authStatusChangedEmitter = new vscode.EventEmitter();
        this.onAuthStatusChanged = this.authStatusChangedEmitter.event;
        this.spacesChangedEmitter = new vscode.EventEmitter();
        this.onSpacesChanged = this.spacesChangedEmitter.event;
        
        this.loadSettings();

        this.api = axios.create({
            baseURL: this.serverUrl,
            withCredentials: true,
            timeout: 10000,
        });

        this.loadStoredAuth();
    }

    loadSettings() {
        const config = vscode.workspace.getConfiguration('architectureArtifacts');
        this.serverUrl = config.get('serverUrl', 'http://localhost:5000');
    }

    async loadStoredAuth() {
        const storedAuth = await this.context.secrets.get('architectureArtifacts.auth');
        const storedSpace = await this.context.secrets.get('architectureArtifacts.currentSpace');
        
        if (storedSpace) {
            try {
                this.currentSpace = storedSpace;
            } catch (error) {
                console.error('Failed to load stored space:', error);
            }
        }
        
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                this.currentUser = authData.user;
                this.sessionToken = authData.sessionToken; // Load the session token
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

    async storeAuth(authData) {
        // Support both old format (just user) and new format (user + sessionToken)
        const dataToStore = authData.user ? authData : { user: authData, sessionToken: this.sessionToken };
        await this.context.secrets.store('architectureArtifacts.auth', JSON.stringify(dataToStore));
    }

    async clearStoredAuth() {
        await this.context.secrets.delete('architectureArtifacts.auth');
        await this.context.secrets.delete('architectureArtifacts.currentSpace');
        this.currentSpace = null;
        this.sessionToken = null; // Clear the session token
        this.spaces = [];
        this.spacesChangedEmitter.fire([]);
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

            const response = await this.api.post('/api/auth/login', {
                username,
                password
            });

            console.log(response.data);

            if (response.status === 200) {

                const userData = response.data;
                this.currentUser = userData.user || userData;
                this.sessionToken = userData.sessionToken; // Store the session token
                this.isAuthenticated = true;
                
                await this.storeAuth({ user: this.currentUser, sessionToken: this.sessionToken });
                this.authStatusChangedEmitter.fire(true);
                
                // Load spaces after successful login
                await this.loadSpaces();

                if (!this.currentUser) {
                    throw new Error('Login succeeded, but was immediately logged out. This might be due to a configuration issue or network problem when fetching user spaces.');
                }

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
            await this.api.post('/api/auth/logout', {});
        } catch (error) {
            console.log('Server logout failed (this is okay):', error);
        }

        // Clear local state regardless of server response
        this.currentUser = null;
        this.sessionToken = null;
        this.isAuthenticated = false;
        this.spaces = [];
        this.currentSpace = null;
        await this.clearStoredAuth();
        this.authStatusChangedEmitter.fire(false);
        this.spacesChangedEmitter.fire([]);

        vscode.window.showInformationMessage('Successfully signed out');
    }

    async checkAuthStatus() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/auth/me');

            if (response.status === 200) {
                const userData = response.data;
                this.currentUser = userData.user || userData;
                this.isAuthenticated = true;
                if (this.currentUser) {
                    await this.storeAuth({ user: this.currentUser, sessionToken: this.sessionToken });
                }
                this.authStatusChangedEmitter.fire(true);
                
                // Load spaces after auth check
                await this.loadSpaces();
                
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
        this.spaces = [];
        this.currentSpace = null;
        this.authStatusChangedEmitter.fire(false);
        this.spacesChangedEmitter.fire([]);
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
        this.api.defaults.baseURL = url;
        // Clear auth when server URL changes
        this.logout();
    }
    
    async loadSpaces() {
        if (!this.isAuthenticated) {
            this.spaces = [];
            this.currentSpace = null;
            this.spacesChangedEmitter.fire([]);
            return;
        }
        
        try {
            const response = await this.makeAuthenticatedRequest('/api/auth/user-spaces');
            this.spaces = response.data;
            
            // Set current space if not already set
            if (this.spaces.length > 0 && (!this.currentSpace || !this.spaces.find(s => s.space === this.currentSpace))) {
                // Default to Personal space if available, otherwise first space
                const personalSpace = this.spaces.find(s => s.space === 'Personal');
                this.currentSpace = personalSpace ? personalSpace.space : this.spaces[0].space;
                await this.saveCurrentSpace();
            }
            
            this.spacesChangedEmitter.fire(this.spaces);
        } catch (error) {
            console.error('Failed to load spaces:', error);
            this.spaces = [];
            this.spacesChangedEmitter.fire([]);
        }
    }
    
    async setCurrentSpace(spaceName) {
        this.currentSpace = spaceName;
        await this.saveCurrentSpace();
        this.spacesChangedEmitter.fire(this.spaces);
    }
    
    async saveCurrentSpace() {
        try {
            if (this.currentSpace) {
                await this.context.secrets.store('architectureArtifacts.currentSpace', this.currentSpace);
            }
        } catch (error) {
            console.error('Failed to save current space:', error);
        }
    }
    
    getSpaces() {
        return this.spaces;
    }
    
    getCurrentSpace() {
        return this.currentSpace;
    }

    async makeAuthenticatedRequest(url, options = {}) {
        try {
            // Prepare headers with authorization token
            const headers = {
                ...options.headers
            };
            
            // Add Authorization header if we have a session token
            if (this.sessionToken) {
                headers.Authorization = `Bearer ${this.sessionToken}`;
            } else {
                console.log(`[VS Code Extension] makeAuthenticatedRequest - No session token available`);
            }
                        
            const response = await this.api({
                url: url,
                ...options,
                headers: headers
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
                
                // Show current space if available
                const currentSpace = this.authManager.getCurrentSpace();
                if (currentSpace) {
                    items.push(new ArchitectureArtifactsItem(
                        `Space: ${currentSpace}`,
                        vscode.TreeItemCollapsibleState.None,
                        'space',
                        null
                    ));
                }
                
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
            case 'space':
                return 'Current space for documentation search';
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
            case 'space':
                return new vscode.ThemeIcon('database');
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

        this.panel.webview.html = this.getWebviewContent(); // Placeholder for webview content

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
                    case 'loadSpaces':
                        await this.handleLoadSpaces();
                        break;
                    case 'setSpace':
                        await this.handleSetSpace(message.space);
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

        // Send initial auth status and spaces
        this.sendAuthStatus();
        this.sendSpaces();
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
            let url = `${endpoint}?q=${encodeURIComponent(query)}`;
            
            // Add space parameter if a space is selected
            const currentSpace = this.authManager.getCurrentSpace();
            if (currentSpace) {
                url += `&space=${encodeURIComponent(currentSpace)}`;
            }
            
            const response = await this.authManager.makeAuthenticatedRequest(url);

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
        console.log(`[VS Code Extension] handleGetFile called with filePath: ${filePath}`);
        
        if (!this.authManager.getIsAuthenticated()) {
            console.log('[VS Code Extension] User not authenticated, sending fileError');
            this.panel?.webview.postMessage({
                command: 'fileError',
                error: 'Authentication required. Please sign in first.'
            });
            return;
        }

        try {
            let url = `/api/files/${encodeURIComponent(filePath)}`;
            
            // Add space parameter if a space is selected
            const currentSpace = this.authManager.getCurrentSpace();
            console.log(`[VS Code Extension] Current space: ${currentSpace}`);
            
            if (currentSpace) {
                url = `/api/${encodeURIComponent(currentSpace)}/files/${encodeURIComponent(filePath)}`;
            }
            
            console.log(`[VS Code Extension] Making request to URL: ${url}`);
            console.log(`[VS Code Extension] Has session token: ${!!this.authManager.sessionToken}`);
            
            const response = await this.authManager.makeAuthenticatedRequest(url);
            
            console.log(`[VS Code Extension] Raw server response:`, response.data);
            console.log(`[VS Code Extension] cleanContent:`, response.data.cleanContent);
            console.log(`[VS Code Extension] content:`, response.data.content);
            
            const contentToSend = response.data.content || response.data.cleanContent || '';
            console.log(`[VS Code Extension] Final content to send length:`, contentToSend.length);
            console.log(`[VS Code Extension] Final content preview:`, contentToSend.substring(0, 200));

            const message = {
                command: 'fileContent',
                filePath: filePath,
                content: contentToSend
            };
            console.log(`[VS Code Extension] Sending postMessage:`, message);
            
            if (this.panel?.webview) {
                console.log(`[VS Code Extension] Webview exists, posting message`);
                this.panel.webview.postMessage(message);
            } else {
                console.error(`[VS Code Extension] ERROR: No webview available to post message to`);
            }
        } catch (error) {
            console.error(`[VS Code Extension] Error loading file:`, error);
            console.error(`[VS Code Extension] Error response status:`, error.response?.status);
            console.error(`[VS Code Extension] Error response data:`, error.response?.data);
            
            this.panel?.webview.postMessage({
                command: 'fileError',
                error: error.message || 'Failed to load file'
            });
        }
    }

    async handleCheckAuth() {
        await this.authManager.checkAuthStatus();
        this.sendAuthStatus();
        this.sendSpaces();
    }
    
    async handleLoadSpaces() {
        await this.authManager.loadSpaces();
        this.sendSpaces();
    }
    
    async handleSetSpace(space) {
        await this.authManager.setCurrentSpace(space);
        this.sendSpaces();
    }

    async handleLogin() {
        const success = await this.authManager.login();
        if (success) {
            this.sendAuthStatus();
            this.sendSpaces();
        }
    }

    async handleLogout() {
        await this.authManager.logout();
        this.sendAuthStatus();
        this.sendSpaces();
    }

    sendAuthStatus() {
        const user = this.authManager.getUser();
        this.panel?.webview.postMessage({
            command: 'authStatus',
            isAuthenticated: this.authManager.getIsAuthenticated(),
            user: user
        });
    }
    
    sendSpaces() {
        const spaces = this.authManager.getSpaces();
        const currentSpace = this.authManager.getCurrentSpace();
        this.panel?.webview.postMessage({
            command: 'spacesData',
            spaces: spaces,
            currentSpace: currentSpace
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
        
        .spaces-section {
            margin-bottom: 20px;
            padding: 12px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            background-color: var(--vscode-editor-background);
        }
        
        .spaces-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .spaces-label {
            font-size: 12px;
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
            white-space: nowrap;
            margin: 0;
        }
        
        .spaces-select {
            flex: 1;
            padding: 6px 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            cursor: pointer;
        }
        
        .spaces-select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js"></script>
</head>
<body>
    <div class="header">
        <div class="logo">
            <h1>Architecture Artifacts</h1>
        </div>
        <div class="auth-section">
            <span class="auth-status" id="authStatus">Checking...</span>
            <button class="auth-button" id="authButton" onclick="handleAuth()">Sign In</button>
        </div>
    </div>

    <div id="mainContent" style="display: none;">
        <div class="spaces-section" id="spacesSection" style="display: none;">
            <div class="spaces-container">
                <label for="spaceSelect" class="spaces-label">Space:</label>
                <select id="spaceSelect" class="spaces-select">
                    <option value="">Loading spaces...</option>
                </select>
            </div>
        </div>
        
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
        let spaces = [];
        let currentSpace = null;

        // Check auth status and load spaces on load
        vscode.postMessage({ command: 'checkAuth' });
        vscode.postMessage({ command: 'loadSpaces' });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('[VS Code Webview] Received message:', message);
            
            switch (message.command) {
                case 'authStatus':
                    console.log('[VS Code Webview] Processing authStatus message');
                    handleAuthStatus(message.isAuthenticated, message.user);
                    break;
                case 'searchResults':
                    console.log('[VS Code Webview] Processing searchResults message');
                    handleSearchResults(message.results, message.query);
                    break;
                case 'searchError':
                    console.log('[VS Code Webview] Processing searchError message');
                    handleSearchError(message.error);
                    break;
                case 'fileContent':
                    console.log('[VS Code Webview] Processing fileContent message');
                    handleFileContent(message.filePath, message.content);
                    break;
                case 'fileError':
                    console.log('[VS Code Webview] Processing fileError message');
                    handleFileError(message.error);
                    break;
                case 'spacesData':
                    console.log('[VS Code Webview] Processing spacesData message');
                    handleSpacesData(message.spaces, message.currentSpace);
                    break;
                default:
                    console.log('[VS Code Webview] Unknown message command:', message.command);
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
                
                // Load spaces when authenticated
                vscode.postMessage({ command: 'loadSpaces' });
            } else {
                authStatus.textContent = 'Not Signed In';
                authStatus.classList.remove('authenticated');
                authButton.textContent = 'Sign In';
                mainContent.style.display = 'none';
                authRequired.style.display = 'block';
                
                // Hide spaces when not authenticated
                document.getElementById('spacesSection').style.display = 'none';
            }
        }

        function handleAuth() {
            if (isAuthenticated) {
                vscode.postMessage({ command: 'logout' });
            } else {
                vscode.postMessage({ command: 'login' });
            }
        }

        function handleSpacesData(spacesData, selectedSpace) {
            spaces = spacesData;
            currentSpace = selectedSpace;
            updateSpacesUI();
        }
        
        function updateSpacesUI() {
            const spacesSection = document.getElementById('spacesSection');
            const spaceSelect = document.getElementById('spaceSelect');
            
            if (!isAuthenticated || spaces.length === 0) {
                spacesSection.style.display = 'none';
                return;
            }
            
            spacesSection.style.display = 'block';
            spaceSelect.innerHTML = '';
            
            // Add spaces as options
            spaces.forEach(space => {
                const option = document.createElement('option');
                option.value = space.space;
                option.textContent = space.space;
                spaceSelect.appendChild(option);
            });
            
            // Set current space
            if (currentSpace) {
                spaceSelect.value = currentSpace;
            }
        }
        
        function handleSpaceChange() {
            const selectedSpace = document.getElementById('spaceSelect').value;
            if (selectedSpace !== currentSpace) {
                currentSpace = selectedSpace;
                vscode.postMessage({ command: 'setSpace', space: selectedSpace });
                
                // Clear search results when switching spaces
                document.getElementById('resultsList').innerHTML = '';
                document.getElementById('searchInput').value = '';
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
                case 'md': return 'md';
                case 'pdf': return 'pdf';
                case 'txt': return 'txt';
                case 'json': return 'json';
                case 'js':
                case 'ts': return 'javascript';
                case 'html': return 'html';
                case 'css': return 'css';
                case 'png':
                case 'jpg':
                case 'jpeg':
                case 'gif': return 'image';
                default: return 'file';
            }
        }

        function highlightSearchTerms(text, query) {
            if (!text || !query) return escapeHtml(text);

            const escapedText = escapeHtml(text);
            const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
            
            let highlightedText = escapedText;
            terms.forEach(term => {
                const regex = new RegExp(\`(\${escapeRegex(term)})\`, 'gi');
                highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
            });

            return highlightedText;
        }

        function showPreview(result) {
            const filePath = result.filePath || result.fileName;
            console.log('[VS Code Webview] showPreview called');
            console.log('[VS Code Webview] result object:', result);
            console.log('[VS Code Webview] extracted filePath:', filePath);
            
            document.getElementById('previewTitle').textContent = filePath || 'Preview';
            
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('previewSection').style.display = 'block';
            console.log('[VS Code Webview] Switched to preview view');
            
            console.log('[VS Code Webview] Sending getFile message to extension');
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
            console.log('[VS Code Webview] handleFileContent called');
            console.log('[VS Code Webview] filePath:', filePath);
            console.log('[VS Code Webview] content length:', content ? content.length : 'null/undefined');
            console.log('[VS Code Webview] content preview:', content ? content.substring(0, 100) : 'empty');
            
            const previewContent = document.getElementById('previewContent');
            if (!previewContent) {
                console.error('[VS Code Webview] previewContent element not found');
                return;
            }
            
            const htmlContent = markdownToHtml(content);
            console.log('[VS Code Webview] converted HTML length:', htmlContent ? htmlContent.length : 'null/undefined');
            
            previewContent.innerHTML = htmlContent;
            console.log('[VS Code Webview] Content set to previewContent element');
            console.log('[VS Code Webview] previewContent element after setting:', previewContent);
            console.log('[VS Code Webview] previewContent innerHTML length after setting:', previewContent.innerHTML.length);
            console.log('[VS Code Webview] previewContent visible?', previewContent.offsetWidth > 0 && previewContent.offsetHeight > 0);
            console.log('[VS Code Webview] previewContent parent element:', previewContent.parentElement);
            
            // Also check if preview section is visible
            const previewSection = document.getElementById('previewSection');
            if (previewSection) {
                console.log('[VS Code Webview] previewSection display style:', getComputedStyle(previewSection).display);
                console.log('[VS Code Webview] previewSection visible?', previewSection.offsetWidth > 0 && previewSection.offsetHeight > 0);
            } else {
                console.error('[VS Code Webview] previewSection element not found');
            }
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
            console.log('[VS Code Webview] markdownToHtml called with input length:', markdown ? markdown.length : 'null/undefined');
            if (!markdown) {
                console.log('[VS Code Webview] markdownToHtml returning empty string - no input');
                return '';
            }
            
            console.log('[VS Code Webview] markdown input preview:', markdown.substring(0, 100));
            
            try {
                // Check if markdownit is available
                if (typeof markdownit === 'undefined') {
                    console.error('[VS Code Webview] markdownit library not loaded');
                    return '<p>Markdown library not loaded</p>';
                }
                
                const md = markdownit();
                const result = md.render(markdown);
                console.log('[VS Code Webview] markdownToHtml result length:', result ? result.length : 'null/undefined');
                console.log('[VS Code Webview] markdownToHtml result preview:', result ? result.substring(0, 200) : 'empty');
                return result;
            } catch (error) {
                console.error('[VS Code Webview] Error in markdownToHtml:', error);
                return \`<p>Error rendering markdown: \${error.message}</p>\`;
            }
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
            return string.replace(/[.*+?^$\\{\\}()|]/g, '\\\\\\\\$&').replace(/\\\\/g, '\\\\\\\\\\\\\\\\');
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
        
        // Space selection change
        document.getElementById('spaceSelect').addEventListener('change', handleSpaceChange);
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
                label: 'Server URL',
                description: currentServerUrl,
                detail: 'Configure the Architecture Artifacts server URL'
            },
            {
                label: 'Auto Login',
                description: currentAutoLogin ? 'Enabled' : 'Disabled',
                detail: 'Automatically check authentication status on startup'
            },
            {
                label: 'Test Connection',
                description: 'Test connection to the server',
                detail: 'Verify that the server is accessible'
            },
            {
                label: 'About',
                description: 'Architecture Artifacts Extension',
                detail: 'Version 1.0.0'
            }
        ], {
            title: 'Architecture Artifacts Settings',
            placeHolder: 'Choose a setting to configure'
        }).then(async (selection) => {
            if (!selection) return;

            switch (selection.label) {
                case 'Server URL':
                    await this.configureServerUrl();
                    break;
                case 'Auto Login':
                    await this.configureAutoLogin();
                    break;
                case 'Test Connection':
                    await this.testConnection();
                    break;
                case 'About':
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
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Connecting to ${serverUrl}...`,
            cancellable: false
        }, async (progress) => {
            try {
                // Use the authManager's pre-configured axios instance
                const response = await this.authManager.api.get('/api/auth/me');
                
                // If we get here, it's a 2xx response, so connection is good and we are authenticated.
                vscode.window.showInformationMessage(
                    `Successfully connected to server at ${serverUrl}`,
                    'Sign Out'
                ).then((action) => {
                    if (action === 'Sign Out') {
                        this.authManager.logout();
                    }
                });

            } catch (error) {
                if (error.response?.status === 401) {
                    // 401 is expected if not authenticated, but means server is reachable
                    vscode.window.showInformationMessage(
                        `Successfully connected to server at ${serverUrl}`,
                        'Sign In'
                    ).then((action) => {
                        if (action === 'Sign In') {
                            this.authManager.login();
                        }
                    });
                } else {
                    // Handle other errors like network issues
                    let errorMessage = 'Connection test failed';
                    if (error.code === 'ECONNREFUSED') {
                        errorMessage = 'Connection refused - server may not be running or URL is incorrect.';
                    } else if (error.code === 'ETIMEDOUT' || error.name === 'AbortError') {
                        errorMessage = 'Connection timeout - server may be unavailable.';
                    } else if (error.message) {
                        errorMessage = `Connection failed: ${error.message}`;
                    }

                    vscode.window.showErrorMessage(
                        `${errorMessage}`,
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
        });
    }

    showAbout() {
        const aboutMessage = `Architecture Artifacts VS Code Extension

Version: 1.0.0
Description: Search and preview architecture documentation from your Architecture Artifacts server directly in VS Code

Features:
- Search documentation content and file names
- Preview markdown files with syntax highlighting
- Secure authentication with session management
- Configurable server settings
- VS Code theme integration

Commands:
- Architecture Artifacts: Search Documentation
- Architecture Artifacts: Sign In/Out
- Architecture Artifacts: Settings

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
    
    // Update when spaces change
    authManager.onSpacesChanged((spaces) => {
        if (searchWebview.panel) {
            searchWebview.sendSpaces();
        }
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
