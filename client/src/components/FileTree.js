/**
 * @fileoverview File tree navigation component for Architecture Artifacts.
 * 
 * This component renders a hierarchical file and folder structure with
 * comprehensive file management capabilities. It supports file operations
 * like creation, deletion, renaming, and uploading, along with folder
 * expansion/collapse functionality and context menu interactions.
 * 
 * Key features:
 * - Hierarchical file/folder display
 * - File and folder CRUD operations
 * - Context menu interactions
 * - File upload with drag-and-drop support
 * - Folder expansion/collapse state management
 * - File type detection and icon display
 * - Keyboard navigation support
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, {useState, useEffect, useRef} from 'react';
import { fetchTemplates, fetchUserSpaces } from '../services/api';

/**
 * FileTree component for displaying and managing file/folder structure.
 * @param {Object} props - Component properties.
 * @param {Array} props.files - Array of file/folder objects.
 * @param {Function} props.onFileSelect - Callback for file selection.
 * @param {string} props.selectedFile - Currently selected file path.
 * @param {boolean} props.isLoading - Loading state indicator.
 * @param {Function} props.onCreateFolder - Callback for folder creation.
 * @param {Function} props.onCreateFile - Callback for file creation.
 * @param {Function} props.onDeleteItem - Callback for item deletion.
 * @param {Function} props.onRenameItem - Callback for item renaming.
 * @param {Function} props.onFileUpload - Callback for file upload.
 * @param {Set} props.expandedFolders - Set of folder paths that should be expanded.
 * @param {Function} props.onFolderToggle - Callback when a folder is expanded/collapsed.
 * @param {Array} props.draftFiles - Array of draft file paths that haven't been committed.
 * @param {Object} props.providerInfo - Information about the filing provider (type, capabilities).
 * @param {Function} props.onViewChange - Callback for view changes (recent, starred).
 * @return {JSX.Element} The FileTree component.
 */
const FileTree = ({
  files,
  onFileSelect,
  selectedFile,
  isLoading,
  onCreateFolder,
  onCreateFile,
  onDeleteItem,
  onRenameItem,
  onFileUpload,
  expandedFolders = new Set(),
  onFolderToggle,
  onPublish,
  hasChanges,
  draftFiles = [],
  onViewChange,
  currentSpace,
  onSpaceChange,
  isAuthenticated,
  isReadonly = false,
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState('file');
  const [createPath, setCreatePath] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [spaces, setSpaces] = useState([]);
  const [shortcutsCollapsed, setShortcutsCollapsed] = useState(false);
  const [spacesCollapsed, setSpacesCollapsed] = useState(false);
  // Function to collect all folder paths recursively
  const collectAllFolderPaths = (items) => {
    const folderPaths = new Set();
    const traverse = (items) => {
      items.forEach(item => {
        if (item.type === 'directory') {
          folderPaths.add(item.path);
          if (item.children) {
            traverse(item.children);
          }
        }
      });
    };
    traverse(items);
    return folderPaths;
  };

  // Initialize with all folders collapsed
  const [localCollapsedFolders, setLocalCollapsedFolders] = useState(() => {
    return collectAllFolderPaths(files);
  });
  
  const collapsedFolders = expandedFolders.size > 0 ? 
    new Set([...localCollapsedFolders].filter(path => !expandedFolders.has(path))) : 
    localCollapsedFolders;

  // Update collapsed folders when files change
  React.useEffect(() => {
    if (files.length > 0) {
      setLocalCollapsedFolders(collectAllFolderPaths(files));
    }
  }, [files]);
  const [contextMenu, setContextMenu] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameItemPath, setRenameItemPath] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [uploadPath, setUploadPath] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [focusedItem, setFocusedItem] = useState(null); // Track focused item for keyboard navigation
  const contextMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileTreeRef = useRef(null);

  const handleCreateClick = (type, basePath = '') => {
    if (type === 'file') {
      // For files, redirect to the new markdown form instead of showing modal
      if (onViewChange) {
        onViewChange('new-markdown');
      }
      setContextMenu(null);
      return;
    }
    
    // For folders, still use the modal
    setCreateType(type);
    setCreatePath(basePath);
    setInputValue('');
    setSelectedTemplate('');
    setShowCreateDialog(true);
    setContextMenu(null);
  };

  const loadTemplates = async () => {
    try {
      const templatesData = await fetchTemplates(currentSpace);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  };

  const handleContextMenu = (e, path = '', itemType = 'empty') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path: path,
      itemType: itemType
    });
  };

  const handleDeleteClick = (itemPath) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      if (onDeleteItem) {
        onDeleteItem(itemPath);
      } else {
        console.error('onDeleteItem function not provided');
      }
    }
    setContextMenu(null);
  };

  const handleRenameClick = (itemPath) => {
    const pathParts = itemPath.split('/');
    const currentName = pathParts[pathParts.length - 1];
    setRenameItemPath(itemPath);
    setRenameValue(currentName);
    setShowRenameDialog(true);
    setContextMenu(null);
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (!renameValue.trim()) return;

    // Validate input - no special characters except hyphens and underscores
    const cleanInput = renameValue.trim();
    const invalidChars = /[<>:"/\\|?*]/;
    
    if (invalidChars.test(cleanInput)) {
      alert('Invalid characters detected. Please use only letters, numbers, hyphens, and underscores.');
      return;
    }

    if (onRenameItem) {
      onRenameItem(renameItemPath, cleanInput);
    } else {
      console.error('onRenameItem function not provided');
    }

    setShowRenameDialog(false);
    setRenameValue('');
    setRenameItemPath('');
  };

  const handleRenameCancel = () => {
    setShowRenameDialog(false);
    setRenameValue('');
    setRenameItemPath('');
  };

  const handleUploadClick = (folderPath) => {
    setUploadPath(folderPath);
    setContextMenu(null);
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (10MB limit)
    /*
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    */

    setIsUploading(true);

    try {
      // Call the upload function
      const result = await uploadFileToServer(file, uploadPath);
      // Reset form
      event.target.value = '';
      
      // Call the callback to refresh file tree
      if (onFileUpload) {
        onFileUpload(result.filePath);
      }
      
      // Success is handled by the parent component via toast
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFileToServer = async (file, folderPath) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderPath', folderPath);

    const uploadUrl = currentSpace ? `/api/${currentSpace}/upload` : '/api/upload';
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse JSON, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        handleContextMenuClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handleContextMenuClose();
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  // Keyboard navigation effect
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle keyboard events when file tree is focused and no modals are open
      if (!fileTreeRef.current || 
          !fileTreeRef.current.contains(document.activeElement) || 
          showCreateDialog || 
          showRenameDialog || 
          contextMenu) {
        return;
      }

      if (event.key === 'Delete' && focusedItem) {
        event.preventDefault();
        handleDeleteClick(focusedItem.path);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedItem, showCreateDialog, showRenameDialog, contextMenu, handleDeleteClick]);

  // Load spaces when component mounts and user is authenticated
  useEffect(() => {
    const loadSpaces = async () => {
      if (isAuthenticated) {
        try {
          const userSpaces = await fetchUserSpaces();
          setSpaces(userSpaces);
        } catch (error) {
          console.error('Failed to load spaces:', error);
        }
      }
    };
    
    loadSpaces();
  }, [isAuthenticated]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Validate input - no special characters except hyphens and underscores
    const cleanInput = inputValue.trim();
    const invalidChars = /[<>:"/\\|?*]/;
    
    if (invalidChars.test(cleanInput)) {
      alert('Invalid characters detected. Please use only letters, numbers, hyphens, and underscores.');
      return;
    }

    const fullPath = createPath
      ? `${createPath}/${cleanInput}`
      : cleanInput;

    if (createType === 'folder') {
      onCreateFolder(fullPath);
    } else {
      // Ensure .md extension for files
      const fileName = fullPath.endsWith('.md') ?
        fullPath :
        `${fullPath}.md`;
      
      // Get template content if selected
      let templateContent = '';
      if (selectedTemplate) {
        const template = templates.find(t => t.name === selectedTemplate);
        templateContent = template ? template.content : '';
      }
      
      onCreateFile(fileName, templateContent);
    }

    setShowCreateDialog(false);
    setInputValue('');
    setSelectedTemplate('');
  };

  const handleCreateCancel = () => {
    setShowCreateDialog(false);
    setInputValue('');
    setSelectedTemplate('');
  };

  const toggleFolder = (folderPath) => {
    const newCollapsed = new Set(localCollapsedFolders);
    if (newCollapsed.has(folderPath)) {
      newCollapsed.delete(folderPath);
    } else {
      newCollapsed.add(folderPath);
    }
    setLocalCollapsedFolders(newCollapsed);
    
    // Notify parent component about folder toggle
    if (onFolderToggle) {
      onFolderToggle(folderPath, !newCollapsed.has(folderPath));
    }
  };

  const renderFileItem = (item, depth = 0) => {
    const isSelected = selectedFile === item.path;
    const paddingLeft = depth * 1.5;
    const isCollapsed = collapsedFolders.has(item.path);
    const isDraft = draftFiles.includes(item.path);

    if (item.type === 'directory') {
      return (
        <div key={item.path}>
          <div
            className="file-tree-item directory"
            style={{paddingLeft: `${paddingLeft}rem`}}
            tabIndex={0}
            onClick={() => toggleFolder(item.path)}
            onFocus={() => setFocusedItem({path: item.path, type: 'directory', name: item.name})}
            onContextMenu={(e) => handleContextMenu(e, item.path, 'directory')}>
            <div className="folder-content">
              <span className="icon">
                <i className={`bi ${isCollapsed ? 'bi-folder2' : 'bi-folder2-open'}${isDraft ? ' text-primary' : ''}`}></i>
              </span>
              <span className={`file-name${isDraft ? ' text-primary fw-semibold' : ''}`} title={item.name}>
                {item.name}
                {isDraft && <i className="bi bi-circle-fill text-primary ms-1" style={{fontSize: '0.5rem'}}></i>}
              </span>
            </div>
            <div className="file-tree-actions">
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateClick('folder', item.path);
                }}
                onContextMenu={(e) => e.stopPropagation()}
                title="Create folder">
                <i className="bi bi-folder-plus"></i>
              </button>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateClick('file', item.path);
                }}
                onContextMenu={(e) => e.stopPropagation()}
                title="Create file">
                <i className="bi bi-file-earmark-plus"></i>
              </button>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadClick(item.path);
                }}
                onContextMenu={(e) => e.stopPropagation()}
                title={isUploading ? "Uploading file..." : "Upload file"}
                disabled={isUploading}>
                {isUploading ? (
                  <div className="spinner-border spinner-border-sm" role="status" style={{ width: '12px', height: '12px' }}>
                    <span className="visually-hidden">Uploading...</span>
                  </div>
                ) : (
                  <i className="bi bi-upload"></i>
                )}
              </button>
            </div>
          </div>
          {!isCollapsed && item.children &&
            item.children.map((child) => renderFileItem(child, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={item.path}
        className={`file-tree-item file ${isSelected ? 'selected' : ''}`}
        style={{paddingLeft: `${paddingLeft}rem`}}
        tabIndex={0}
        onClick={() => onFileSelect(item.path)}
        onFocus={() => setFocusedItem({path: item.path, type: 'file', name: item.name})}
        onContextMenu={(e) => handleContextMenu(e, item.path, 'file')}>
        <span className="icon">
          <i className={`bi bi-file-earmark-text${isDraft ? ' text-primary' : ''}`}></i>
        </span>
        <span className={`file-name${isDraft ? ' text-primary fw-semibold' : ''}`} title={item.name}>
          {item.name}
          {isDraft && <i className="bi bi-circle-fill text-primary ms-1" style={{fontSize: '0.5rem'}}></i>}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="loading">
        <span>Loading files...</span>
      </div>
    );
  }

  // Helper function to get appropriate icon for each space
  const getSpaceIcon = (space) => {
    switch (space.space) {
      case 'Personal':
        return 'bi-person-circle';
      case 'Shared':
        return 'bi-people';
      case 'Enterprise':
        return 'bi-building';
      default:
        return 'bi-collection';
    }
  };

  return (
    <div ref={fileTreeRef} className="file-tree d-flex flex-column h-100">
      {/* Hidden file input for upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        accept="*/*"
      />
      
      <div className="file-tree-header flex-shrink-0">
        {/* Collapsible Shortcuts Section */}
        <div className="shortcuts-section mb-3">
          <div 
            className="section-header d-flex align-items-center justify-content-between p-2 rounded cursor-pointer"
            onClick={() => setShortcutsCollapsed(!shortcutsCollapsed)}
            style={{cursor: 'pointer', backgroundColor: 'var(--section-header-bg, rgba(0, 0, 0, 0.02))'}}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--section-header-hover-bg, rgba(0, 0, 0, 0.05))'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--section-header-bg, rgba(0, 0, 0, 0.02))'}
          >
            <div className="d-flex align-items-center">
              <i className={`bi ${shortcutsCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} me-2 text-muted`}></i>
              <h3 className="h6 mb-0 fw-semibold text-confluence-text">Shortcuts</h3>
            </div>
          </div>
          
          {!shortcutsCollapsed && (
            <div className="nav-options mt-2">
              <div 
                className="nav-option d-flex align-items-center justify-content-between p-2 rounded cursor-pointer"
                onClick={() => onViewChange && onViewChange('home')}
                style={{cursor: 'pointer', backgroundColor: 'var(--nav-option-bg, transparent)', marginLeft: '1rem'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--nav-option-hover-bg, rgba(0, 0, 0, 0.05))'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--nav-option-bg, transparent)'}
              >
                <div className="d-flex align-items-center">
                  <i className="bi bi-house me-2 text-muted"></i>
                  <span className="text-confluence-text">Home</span>
                </div>
                <i className="bi bi-chevron-right text-muted"></i>
              </div>
              
              <div 
                className="nav-option d-flex align-items-center justify-content-between p-2 rounded cursor-pointer mt-1"
                onClick={() => onViewChange && onViewChange('recent')}
                style={{cursor: 'pointer', backgroundColor: 'var(--nav-option-bg, transparent)', marginLeft: '1rem'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--nav-option-hover-bg, rgba(0, 0, 0, 0.05))'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--nav-option-bg, transparent)'}
              >
                <div className="d-flex align-items-center">
                  <i className="bi bi-clock-history me-2 text-muted"></i>
                  <span className="text-confluence-text">Recent</span>
                </div>
                <i className="bi bi-chevron-right text-muted"></i>
              </div>
              
              <div 
                className="nav-option d-flex align-items-center justify-content-between p-2 rounded cursor-pointer mt-1"
                onClick={() => onViewChange && onViewChange('starred')}
                style={{cursor: 'pointer', backgroundColor: 'var(--nav-option-bg, transparent)', marginLeft: '1rem'}}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--nav-option-hover-bg, rgba(0, 0, 0, 0.05))'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--nav-option-bg, transparent)'}
              >
                <div className="d-flex align-items-center">
                  <i className="bi bi-star me-2 text-muted"></i>
                  <span className="text-confluence-text">Starred</span>
                </div>
                <i className="bi bi-chevron-right text-muted"></i>
              </div>
              
              {!isReadonly && (
                <div 
                  className="nav-option d-flex align-items-center justify-content-between p-2 rounded cursor-pointer mt-1"
                  onClick={() => onViewChange && onViewChange('templates')}
                  style={{cursor: 'pointer', backgroundColor: 'var(--nav-option-bg, transparent)', marginLeft: '1rem'}}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--nav-option-hover-bg, rgba(0, 0, 0, 0.05))'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--nav-option-bg, transparent)'}
                >
                  <div className="d-flex align-items-center">
                    <i className="bi bi-file-earmark-code me-2 text-muted"></i>
                    <span className="text-confluence-text">Templates</span>
                  </div>
                  <i className="bi bi-chevron-right text-muted"></i>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Files section header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="h5 mb-0 fw-semibold text-confluence-text">
            Files {isUploading && <small className="text-primary">Uploading...</small>}
          </h3>
          {!isReadonly && (
            <button
              className={`btn btn-sm ${hasChanges ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onPublish}
              disabled={!hasChanges || isLoading}
              title={hasChanges ? "Publish changes" : "No changes to publish"}>
              <i className="bi bi-cloud-upload me-1"></i>
              Publish
            </button>
          )}
        </div>
        
        {!isReadonly && (
          <div className="d-flex gap-2 file-tree-toolbar">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleCreateClick('folder')}
              disabled={isLoading}
              title="Create new folder">
              <i className="bi bi-folder-plus"></i>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleCreateClick('file')}
              disabled={isLoading}
              title="Create new file">
              <i className="bi bi-file-earmark-plus"></i>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleUploadClick('')}
              disabled={isLoading || isUploading}
              title={isUploading ? "Uploading file..." : "Upload file"}>
              {isUploading ? (
                <div className="spinner-border spinner-border-sm" role="status" style={{ width: '14px', height: '14px' }}>
                  <span className="visually-hidden">Uploading...</span>
                </div>
              ) : (
                <i className="bi bi-upload"></i>
              )}
            </button>
          </div>
        )}
      </div>

      <div 
        className="file-tree-content flex-grow-1 overflow-auto"
        onContextMenu={(e) => handleContextMenu(e, '')}
        style={{ 
          maxHeight: 'calc(100vh - 200px)', 
          overflowY: 'auto',
          paddingBottom: '1rem'
        }}>
        {files.length === 0 ? (
          <div className="text-center p-4 empty-state">
            <h3 className="h6 fw-medium mb-2">No files found</h3>
            <p className="mb-0 small text-muted">Create some markdown files to get started.</p>
          </div>
        ) : (
          files.map((file) => renderFileItem(file))
        )}
      </div>

      {/* Collapsible Spaces Navigation Section */}
      {isAuthenticated && spaces.length > 0 && (
        <div className="mt-4 pt-3 border-top">
          <div 
            className="section-header d-flex align-items-center justify-content-between p-2 rounded cursor-pointer"
            onClick={() => setSpacesCollapsed(!spacesCollapsed)}
            style={{cursor: 'pointer', backgroundColor: 'var(--section-header-bg, rgba(0, 0, 0, 0.02))'}}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--section-header-hover-bg, rgba(0, 0, 0, 0.05))'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--section-header-bg, rgba(0, 0, 0, 0.02))'}
          >
            <div className="d-flex align-items-center">
              <i className={`bi ${spacesCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} me-2 text-muted`}></i>
              <h3 className="h6 mb-0 fw-semibold text-confluence-text">Spaces</h3>
            </div>
            <span className="badge bg-secondary small">{spaces.length}</span>
          </div>
          
          {!spacesCollapsed && (
            <div className="spaces-nav mt-2">
              {spaces.map((space) => (
                <div 
                  key={space.space}
                  className={`nav-option d-flex align-items-center justify-content-between p-2 rounded cursor-pointer mt-1 ${currentSpace === space.space ? 'active' : ''}`}
                  onClick={() => onSpaceChange && onSpaceChange(space.space)}
                  style={{
                    cursor: 'pointer', 
                    backgroundColor: currentSpace === space.space 
                      ? 'var(--confluence-primary-light, rgba(0, 82, 204, 0.1))' 
                      : 'var(--nav-option-bg, transparent)',
                    marginLeft: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    if (currentSpace !== space.space) {
                      e.target.style.backgroundColor = 'var(--nav-option-hover-bg, rgba(0, 0, 0, 0.05))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentSpace !== space.space) {
                      e.target.style.backgroundColor = 'var(--nav-option-bg, transparent)';
                    }
                  }}
                >
                  <div className="d-flex align-items-center">
                    <i className={`bi ${getSpaceIcon(space)} me-2 text-muted`}></i>
                    <span className={`text-confluence-text ${currentSpace === space.space ? 'fw-medium' : ''}`}>
                      {space.space}
                    </span>
                    <small className="ms-2 text-muted">({space.access})</small>
                  </div>
                  {currentSpace === space.space && (
                    <i className="bi bi-check-circle text-primary"></i>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateDialog && createType === 'folder' && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(9, 30, 66, 0.54)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Create New {createType === 'folder' ? 'Folder' : 'File'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCreateCancel}></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="create-name" className="form-label">
                      {createType === 'folder' ? 'Folder' : 'File'} Name:
                    </label>
                    {createPath && (
                      <p className="small text-muted mb-2">
                        Location: {createPath}/
                      </p>
                    )}
                    <input
                      id="create-name"
                      type="text"
                      className="form-control"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        createType === 'folder'
                          ? 'Enter folder name'
                          : 'Enter file name (without .md extension)'
                      }
                      required
                      autoFocus
                    />
                  </div>
                  
                  {createType === 'file' && templates.length > 0 && (
                    <div className="mb-3">
                      <label htmlFor="template-select" className="form-label">
                        Template (optional):
                      </label>
                      <select
                        id="template-select"
                        className="form-select"
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                      >
                        <option value="">No template (blank file)</option>
                        {templates.map((template) => (
                          <option key={template.name} value={template.name}>
                            {template.name} {template.description && `- ${template.description}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCreateCancel}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!inputValue.trim()}>
                    Create {createType === 'folder' ? 'Folder' : 'File'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}>
          {/* Show create options for empty space and directories */}
          {!isReadonly && (contextMenu.itemType === 'empty' || contextMenu.itemType === 'directory') && (
            <div
              className="context-menu-item"
              onClick={() => handleCreateClick('folder', contextMenu.path)}>
              <span className="context-menu-icon">
                <i className="bi bi-folder-plus"></i>
              </span>
              New Folder
            </div>
          )}
          {!isReadonly && (contextMenu.itemType === 'empty' || contextMenu.itemType === 'directory') && (
            <div
              className="context-menu-item"
              onClick={() => handleCreateClick('file', contextMenu.path)}>
              <span className="context-menu-icon">
                <i className="bi bi-file-earmark-plus"></i>
              </span>
              New File
            </div>
          )}
          {!isReadonly && (contextMenu.itemType === 'empty' || contextMenu.itemType === 'directory') && (
            <div
              className="context-menu-item"
              onClick={() => handleUploadClick(contextMenu.path)}>
              <span className="context-menu-icon">
                <i className="bi bi-upload"></i>
              </span>
              Upload File
            </div>
          )}
          
          {/* Show rename and delete options for files and directories */}
          {!isReadonly && (contextMenu.itemType === 'file' || contextMenu.itemType === 'directory') && (
            <>
              {contextMenu.itemType === 'directory' && (
                <div className="context-menu-divider"></div>
              )}
              <div
                className="context-menu-item"
                onClick={() => handleRenameClick(contextMenu.path)}>
                <span className="context-menu-icon">
                  <i className="bi bi-pencil"></i>
                </span>
                Rename
              </div>
              <div
                className="context-menu-item delete-item"
                onClick={() => handleDeleteClick(contextMenu.path)}>
                <span className="context-menu-icon">
                  <i className="bi bi-trash"></i>
                </span>
                Delete
              </div>
            </>
          )}
        </div>
      )}

      {showRenameDialog && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(9, 30, 66, 0.54)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Rename Item</h5>
                <button type="button" className="btn-close" onClick={handleRenameCancel}></button>
              </div>
              <form onSubmit={handleRenameSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="rename-name" className="form-label">New Name:</label>
                    <p className="small text-muted mb-2">
                      Current: {renameItemPath}
                    </p>
                    <input
                      id="rename-name"
                      type="text"
                      className="form-control"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      placeholder="Enter new name"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRenameCancel}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!renameValue.trim()}>
                    Rename
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(FileTree);