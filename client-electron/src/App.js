/**
 * @fileoverview Main application component for Architecture Artifacts Editor.
 * 
 * This is the root component that orchestrates the entire Architecture Artifacts
 * editing application. It manages the overall application state including file
 * selection, content editing, Git integration, and user interface layout. The
 * component provides a complete content management system with file tree navigation,
 * markdown editing capabilities, and integrated version control.
 * 
 * Key features:
 * - File tree navigation with CRUD operations
 * - Multi-format file editing and preview
 * - Integrated Git operations (commit, push, pull, clone)
 * - Resizable sidebar with collapse functionality
 * - Real-time content synchronization
 * - Toast notifications for user feedback
 * - Responsive design with mobile support
 * - File upload and download capabilities
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import FileTree from './components/FileTree';
import MarkdownEditor from './components/MarkdownEditor';
import PublishModal from './components/PublishModal';
import TemplateManager from './components/TemplateManager';
import LoginModal from './components/Auth/LoginModal';
import RegisterModal from './components/Auth/RegisterModal';
import {
  fetchFiles,
  fetchFile,
  saveFile,
  createFolder,
  createFile,
  deleteItem,
  renameItem,
  downloadFile,
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchFiles,
  searchContent,
} from './services/api';
import './App.css';

/**
 * AppContent component that handles the authenticated application logic.
 * @return {JSX.Element} The AppContent component.
 */
function AppContent() {
  const { user, login, logout, isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileData, setFileData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [defaultEditorMode, setDefaultEditorMode] = useState(() => {
    return localStorage.getItem('editorDefaultMode') || 'edit';
  });
  const [templates, setTemplates] = useState([]);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);

  useEffect(() => {
    // Only load data if user is authenticated
    if (isAuthenticated) {
      loadFiles();
      loadTemplates();
    }
    
    // Listen for auth required events from API
    const handleAuthRequired = () => {
      if (!isAuthenticated) {
        setShowLoginModal(true);
      }
    };
    
    window.addEventListener('authRequired', handleAuthRequired);
    return () => window.removeEventListener('authRequired', handleAuthRequired);
  }, [isAuthenticated]);

  // Show landing page for 5 seconds, then show login modal if not authenticated
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // If user is authenticated, hide landing page immediately
        setShowLandingPage(false);
      } else {
        // If not authenticated, show landing page for 5 seconds
        const timer = setTimeout(() => {
          setShowLandingPage(false);
          setShowLoginModal(true);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [loading, isAuthenticated]);

  const loadFiles = async (force = false) => {
    try {
      setIsLoading(true);
      const fileTree = await fetchFiles();
      const updatedTree = diffAndUpdateTree(files, fileTree);
      
      // Only update if tree actually changed or force is true
      if (updatedTree !== files || force) {
        setFiles(updatedTree);
      }
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  // Diff algorithm to only update changed items
  const diffAndUpdateTree = (oldTree, newTree) => {
    // If first load, return new tree
    if (oldTree.length === 0) {
      return newTree;
    }

    // Create maps for quick lookup
    const oldMap = createTreeMap(oldTree);
    const newMap = createTreeMap(newTree);

    // Check if trees are identical
    if (JSON.stringify(oldMap) === JSON.stringify(newMap)) {
      return oldTree; // No changes, keep existing tree
    }

    return newTree; // Return new tree if changes detected
  };

  const createTreeMap = (tree) => {
    const map = {};
    const traverse = (items, parentPath = '') => {
      items.forEach(item => {
        const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
        map[fullPath] = {
          type: item.type,
          name: item.name,
          path: item.path
        };
        if (item.children) {
          traverse(item.children, fullPath);
        }
      });
    };
    traverse(tree);
    return map;
  };

  const handleFileSelect = useCallback(async (filePath) => {
    // Don't reload if the same file is already selected
    if (selectedFile === filePath) {
      return;
    }
    
    try {
      setIsFileLoading(true);
      const data = await fetchFile(filePath);
      setSelectedFile(filePath);
      setFileData(data);
      setFileContent(data.content || '');
      setHasChanges(false);
      
      // Handle downloadable files
      if (data.downloadable) {
        try {
          await downloadFile(filePath);
        } catch (downloadError) {
          toast.error('Failed to download file');
        }
      }
    } catch (error) {
      toast.error('Failed to load file');
    } finally {
      setIsFileLoading(false);
    }
  }, [selectedFile]);

  const handleContentChange = useCallback((newContent) => {
    setFileContent(newContent);
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      
      // Check if this is a template file
      if (fileData?.isTemplate && selectedFile.startsWith('templates/')) {
        const templateName = selectedFile.replace('templates/', '');
        await handleTemplateEdit(templateName, {
          name: templateName,
          content: fileContent,
          description: fileData.description || ''
        });
        setHasChanges(false);
        toast.success('Template saved successfully');
      } else {
        // Regular file save
        await saveFile(selectedFile, fileContent);
        setHasChanges(false);
        toast.success('File saved successfully');
      }
    } catch (error) {
      toast.error('Failed to save file');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = () => {
    setShowPublishModal(false);
    setHasChanges(false);
    loadFiles(true); // Force refresh after publishing
  };

  const handleRepositoryUpdate = () => {
    loadFiles(true); // Force refresh after git operations
    setSelectedFile(null);
    setFileContent('');
    setFileData(null);
    setHasChanges(false);
    setExpandedFolders(new Set()); // Reset expanded folders after git operations
  };

  const handleCreateFolder = async (folderPath) => {
    try {
      setIsLoading(true);
      await createFolder(folderPath);
      
      // Expand all parent folders of the newly created folder
      const pathParts = folderPath.split('/');
      const newExpanded = new Set(expandedFolders);
      
      // Add all parent paths to expanded set
      for (let i = 0; i < pathParts.length; i++) {
        const parentPath = pathParts.slice(0, i + 1).join('/');
        newExpanded.add(parentPath);
      }
      
      setExpandedFolders(newExpanded);
      await loadFiles(true); // Force refresh after creating folder
      toast.success('Folder created successfully');
    } catch (error) {
      toast.error('Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFile = async (filePath, templateContent = '') => {
    try {
      setIsLoading(true);
      await createFile(filePath, templateContent);
      
      // Expand all parent folders of the newly created file
      const pathParts = filePath.split('/');
      const newExpanded = new Set(expandedFolders);
      
      // Add all parent directory paths to expanded set (exclude the file itself)
      for (let i = 0; i < pathParts.length - 1; i++) {
        const parentPath = pathParts.slice(0, i + 1).join('/');
        newExpanded.add(parentPath);
      }
      
      setExpandedFolders(newExpanded);
      await loadFiles(true); // Force refresh after creating file
      toast.success('File created successfully');
      // Automatically open the newly created file
      await handleFileSelect(filePath);
    } catch (error) {
      toast.error('Failed to create file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemPath) => {
    try {
      setIsLoading(true);
      await deleteItem(itemPath);
      await loadFiles(true); // Force refresh after deleting item
      
      // If the deleted item was the currently selected file, clear the selection
      if (selectedFile === itemPath) {
        setSelectedFile(null);
        setFileContent('');
        setFileData(null);
        setHasChanges(false);
      }
      
      toast.success('Item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameItem = async (itemPath, newName) => {
    try {
      setIsLoading(true);
      const result = await renameItem(itemPath, newName);
      await loadFiles(true); // Force refresh after renaming item
      
      // If the renamed item was the currently selected file, update the selection
      if (selectedFile === itemPath) {
        setSelectedFile(result.newPath);
      }
      
      toast.success('Item renamed successfully');
    } catch (error) {
      toast.error('Failed to rename item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    const minWidth = 200;
    const maxWidth = 600;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleEditorModeChange = useCallback((mode) => {
    setDefaultEditorMode(mode);
    localStorage.setItem('editorDefaultMode', mode);
  }, []);

  const handleFileUpload = useCallback(async (filePath) => {
    // Refresh file tree after upload
    await loadFiles(true);
    toast.success('File uploaded successfully');
  }, []);

  const handleFolderToggle = useCallback((folderPath, isExpanded) => {
    const newExpanded = new Set(expandedFolders);
    if (isExpanded) {
      newExpanded.add(folderPath);
    } else {
      newExpanded.delete(folderPath);
    }
    setExpandedFolders(newExpanded);
  }, [expandedFolders]);

  const loadTemplates = async () => {
    try {
      setIsTemplatesLoading(true);
      const templatesData = await fetchTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsTemplatesLoading(false);
    }
  };

  const handleTemplateCreate = async (templateData) => {
    try {
      await createTemplate(templateData);
      await loadTemplates();
    } catch (error) {
      throw error;
    }
  };

  const handleTemplateEdit = async (templateName, templateData) => {
    try {
      await updateTemplate(templateName, templateData);
      await loadTemplates();
    } catch (error) {
      throw error;
    }
  };

  const handleTemplateDelete = async (templateName) => {
    try {
      await deleteTemplate(templateName);
      await loadTemplates();
    } catch (error) {
      throw error;
    }
  };

  const handleTemplateSelect = async (template, action = 'use') => {
    if (action === 'edit') {
      // Edit template in main editor
      setSelectedFile(`templates/${template.name}`);
      setFileContent(template.content || '');
      setFileData({
        content: template.content || '',
        path: `templates/${template.name}`,
        fileType: 'markdown',
        isTemplate: true
      });
      setHasChanges(false);
    } else {
      // Use template (existing functionality)
      console.log('Template selected for use:', template);
    }
  };

  const handleSearchChange = useCallback(async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setHighlightedIndex(-1);
    
    if (query.trim().length > 0) {
      try {
        // Search both files and content simultaneously
        const [fileSuggestions, contentResults] = await Promise.all([
          searchFiles(query),
          searchContent(query)
        ]);
        
        setSearchSuggestions(fileSuggestions.slice(0, 5)); // Limit to 5 file suggestions
        setSearchResults(contentResults.slice(0, 10)); // Limit to 10 content results
        setShowSearchResults(true);
      } catch (error) {
        console.error('Error fetching search results:', error);
        setSearchSuggestions([]);
        setSearchResults([]);
      }
    } else {
      setSearchSuggestions([]);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, []);

  const handleSearchSubmit = useCallback(async () => {
    if (searchQuery.trim().length === 0) return;
    
    try {
      // Get more comprehensive results when explicitly searching
      const [fileSuggestions, contentResults] = await Promise.all([
        searchFiles(searchQuery),
        searchContent(searchQuery)
      ]);
      
      setSearchSuggestions(fileSuggestions.slice(0, 10)); // More file results on submit
      setSearchResults(contentResults.slice(0, 20)); // More content results on submit
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Search failed');
    }
  }, [searchQuery]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSearchQuery('');
      setSearchSuggestions([]);
      setSearchResults([]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev < searchSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => prev > 0 ? prev - 1 : -1);
    }
  }, [searchSuggestions.length, handleSearchSubmit]);

  const handleSearchResultClick = useCallback(async (result) => {
    await handleFileSelect(result.filePath);
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchSuggestions([]);
    setSearchResults([]);
    
    // Expand folders to show the selected file
    const pathParts = result.filePath.split('/');
    const newExpanded = new Set(expandedFolders);
    for (let i = 0; i < pathParts.length - 1; i++) {
      const parentPath = pathParts.slice(0, i + 1).join('/');
      newExpanded.add(parentPath);
    }
    setExpandedFolders(newExpanded);
  }, [handleFileSelect, expandedFolders]);

  // Auth handlers
  const handleAuthSuccess = (userData) => {
    login(userData); // Update the auth context immediately
  };

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.position-relative')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="app">
        <div className="d-flex justify-content-center align-items-center" style={{height: '100vh'}}>
          <div className="text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-3">
              <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 22V12" stroke="#0052cc" strokeWidth="2"/>
              <path d="M2 7L12 12L22 7" stroke="#0052cc" strokeWidth="2"/>
            </svg>
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <h5 className="text-confluence-text">Architecture Artifacts Editor</h5>
            <p className="text-muted">Loading application...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication screen if not authenticated
  if (!isAuthenticated) {
    // Show landing page for 5 seconds before showing auth options
    if (showLandingPage) {
      return (
        <div className="app">
          <div className="d-flex justify-content-center align-items-center" style={{height: '100vh', background: 'var(--confluence-bg)'}}>
            <div className="text-center" style={{maxWidth: '400px', padding: '2rem'}}>
              <div className="mb-4">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
                  <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M12 22V12" stroke="#0052cc" strokeWidth="2"/>
                  <path d="M2 7L12 12L22 7" stroke="#0052cc" strokeWidth="2"/>
                </svg>
              </div>
              <h1 className="text-confluence-text mb-3">Architecture Artifacts</h1>
              <p className="text-muted">Modern documentation workspace for architecture teams</p>
            </div>
          </div>
        </div>
      );
    }

    // Show authentication options after landing page
    return (
      <div className="app">
        <div className="d-flex justify-content-center align-items-center" style={{height: '100vh', background: 'var(--confluence-bg)'}}>
          <div className="text-center" style={{maxWidth: '400px', padding: '2rem'}}>
            <div className="mb-4">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-3">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M12 22V12" stroke="#0052cc" strokeWidth="2"/>
                <path d="M2 7L12 12L22 7" stroke="#0052cc" strokeWidth="2"/>
              </svg>
            </div>
            <h2 className="text-confluence-text mb-3">Welcome to Architecture Artifacts</h2>
            <p className="text-muted mb-4">Please sign in to access your documentation workspace.</p>
            <div className="d-flex gap-2 justify-content-center">
              <button
                className="btn btn-primary"
                onClick={() => setShowLoginModal(true)}
              >
                Sign In
              </button>
              <button
                className="btn btn-outline-primary"
                onClick={() => setShowRegisterModal(true)}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
        
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleAuthSuccess}
          onSwitchToRegister={handleSwitchToRegister}
        />
        
        <RegisterModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={handleSwitchToLogin}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <nav className="navbar navbar-expand-lg">
          <div className="container-fluid">
            <div className="d-flex align-items-center w-100">
              <button
                className="btn btn-secondary btn-sm sidebar-toggle me-3"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              >
                <i className={`bi ${sidebarCollapsed ? 'bi-layout-sidebar' : 'bi-aspect-ratio'}`}></i>
              </button>
              
              <a className="navbar-brand fw-medium me-3 d-flex align-items-center" href="#">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="me-2">
                  <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M12 22V12" stroke="#0052cc" strokeWidth="2"/>
                  <path d="M2 7L12 12L22 7" stroke="#0052cc" strokeWidth="2"/>
                </svg>
                Architecture Artifacts Editor
              </a>
              
              <div className="flex-grow-1 me-3">
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control form-control-sm pe-5"
                    placeholder="Search files and content..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => setShowSearchResults(true)}
                  />
                  <button 
                    className="btn btn-sm btn-outline-secondary position-absolute top-50 end-0 translate-middle-y me-1"
                    style={{border: 'none', padding: '0.25rem 0.5rem'}}
                    onClick={handleSearchSubmit}
                  >
                    <i className="bi bi-search"></i>
                  </button>
                  
                  {showSearchResults && (searchSuggestions.length > 0 || searchResults.length > 0) && (
                    <div className="position-absolute w-100 bg-white border rounded-bottom shadow-sm mt-1" style={{zIndex: 1050, maxHeight: '300px', overflowY: 'auto'}}>
                      {searchSuggestions.length > 0 && (
                        <div>
                          <div className="px-3 py-2 bg-light border-bottom small text-muted">Files</div>
                          {searchSuggestions.map((file, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 cursor-pointer border-bottom search-suggestion"
                              onClick={() => handleFileSelect(file.path)}
                              onMouseEnter={() => setHighlightedIndex(index)}
                            >
                              <div className="d-flex align-items-center">
                                <i className="bi bi-file-earmark-text me-2 text-muted"></i>
                                <span>{file.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {searchResults.length > 0 && (
                        <div>
                          <div className="px-3 py-2 bg-light border-bottom small text-muted">Content Results</div>
                          {searchResults.map((result, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 cursor-pointer border-bottom search-result"
                              onClick={() => handleSearchResultClick(result)}
                            >
                              <div className="fw-medium text-primary">{result.fileName}</div>
                              <div className="small text-muted" dangerouslySetInnerHTML={{__html: result.preview}}></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-2 editor-mode-toggle">
                  
                  <select
                    id="editor-mode-select"
                    value={defaultEditorMode}
                    onChange={(e) => handleEditorModeChange(e.target.value)}
                    className="form-select form-select-sm"
                  >
                    <option value="edit">Edit</option>
                    <option value="preview">Preview</option>
                    <option value="split">Split View</option>
                  </select>
                </div>
                
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={toggleTheme}
                  title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                  <i className={`bi ${isDark ? 'bi-sun' : 'bi-moon'}`}></i>
                </button>
                
                {isAuthenticated ? (
                  <>
                    <div className="d-flex align-items-center me-3">
                      <div className="user-avatar me-2">
                        <i className="bi bi-person-circle text-primary" style={{fontSize: '1.5rem'}}></i>
                      </div>
                      <div className="user-info">
                        <div className="user-welcome text-confluence-text fw-semibold">
                          Welcome, {user?.username}!
                        </div>
                        <div className="user-status small text-muted">
                          Authenticated
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={logout}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-outline-primary btn-sm me-2"
                      onClick={() => setShowLoginModal(true)}
                    >
                      Login
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowRegisterModal(true)}
                    >
                      Register
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="app-main">
        {!sidebarCollapsed && (
          <aside className="sidebar" style={{ width: `${sidebarWidth}px` }}>
            <div className="sidebar-content">
            <FileTree
              files={files}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              isLoading={isLoading}
              onCreateFolder={handleCreateFolder}
              onCreateFile={handleCreateFile}
              onDeleteItem={handleDeleteItem}
              onRenameItem={handleRenameItem}
              onFileUpload={handleFileUpload}
              expandedFolders={expandedFolders}
              onFolderToggle={handleFolderToggle}
              onPublish={() => setShowPublishModal(true)}
              hasChanges={hasChanges}
            />
            <TemplateManager
              templates={templates}
              onTemplateSelect={handleTemplateSelect}
              onTemplateCreate={handleTemplateCreate}
              onTemplateEdit={handleTemplateEdit}
              onTemplateDelete={handleTemplateDelete}
              isLoading={isTemplatesLoading}
              selectedFile={selectedFile}
            />
            </div>
            <div className="sidebar-resizer" onMouseDown={handleMouseDown}></div>
          </aside>
        )}

        <section className="editor-section">
          <MarkdownEditor
            content={fileContent}
            onChange={handleContentChange}
            fileName={selectedFile}
            isLoading={isFileLoading}
            onRename={handleRenameItem}
            defaultMode={defaultEditorMode}
            fileData={fileData}
            onSave={handleSave}
            hasChanges={hasChanges}
          />
        </section>
      </main>

      <footer className="app-footer">
        <div className="container-fluid">
          <p className="mb-0 text-center small">© 2025 All rights reserved.</p>
        </div>
      </footer>

      {showPublishModal && (
        <PublishModal
          onPublish={handlePublish}
          onClose={() => setShowPublishModal(false)}
        />
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={handleSwitchToRegister}
      />
      
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

/**
 * Main App component that provides authentication context.
 * @return {JSX.Element} The App component.
 */
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;