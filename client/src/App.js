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
import FileTree from './components/FileTree';
import MarkdownEditor from './components/MarkdownEditor';
import PublishModal from './components/PublishModal';
import TemplateManager from './components/TemplateManager';
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
 * Main App component for the Architecture Artifacts Editor.
 * @return {JSX.Element} The App component.
 */
function App() {
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

  useEffect(() => {
    loadFiles();
    loadTemplates();
  }, []);

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
      await saveFile(selectedFile, fileContent);
      setHasChanges(false);
      toast.success('File saved successfully');
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

  const handleTemplateSelect = async (template) => {
    // This could be used for future functionality if needed
    console.log('Template selected:', template);
  };

  const handleSearchChange = useCallback(async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setHighlightedIndex(-1);
    
    if (query.trim().length > 0) {
      try {
        const fileSuggestions = await searchFiles(query);
        setSearchSuggestions(fileSuggestions.slice(0, 5)); // Limit to 5 suggestions
        setShowSearchResults(true);
      } catch (error) {
        console.error('Error fetching file suggestions:', error);
        setSearchSuggestions([]);
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
      const contentResults = await searchContent(searchQuery);
      setSearchResults(contentResults);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching content:', error);
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
                <i className={`bi ${sidebarCollapsed ? 'bi-list' : 'bi-x-lg'}`}></i>
              </button>
              
              <a className="navbar-brand fw-medium me-3" href="#">Architecture Artifacts Editor</a>
              
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
                  <label htmlFor="editor-mode-select" className="form-label mb-0 small fw-medium">Default mode:</label>
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
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowPublishModal(true)}
                  disabled={!hasChanges || isLoading}>
                  Publish
                </button>
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
            />
            <TemplateManager
              templates={templates}
              onTemplateSelect={handleTemplateSelect}
              onTemplateCreate={handleTemplateCreate}
              onTemplateEdit={handleTemplateEdit}
              onTemplateDelete={handleTemplateDelete}
              isLoading={isTemplatesLoading}
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

export default App;