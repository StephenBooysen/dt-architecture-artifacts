/**
 * @fileoverview Main application component for Architecture Artifacts Editor.
 * 
 * This is the root component that orchestrates the entire Architecture Artifacts
 * editing application. It manages the overall application state including file
 * selection, content editing, and user interface layout. The
 * component provides a complete content management system with file tree navigation,
 * and markdown editing capabilities.
 * 
 * Key features:
 * - File tree navigation with CRUD operations
 * - Multi-format file editing and preview
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
import TemplatesList from './components/TemplatesList';
import RecentFilesView from './components/RecentFilesView';
import StarredFilesView from './components/StarredFilesView';
import SearchResultsView from './components/SearchResultsView';
import HomeView from './components/HomeView';
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
  fetchUserSpaces,
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
  const [draftFiles, setDraftFiles] = useState([]);
  const [providerInfo, setProviderInfo] = useState({ provider: 'git', supportsDrafts: true });
  const [lastSyncCheck, setLastSyncCheck] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('architecture-artifacts-sidebar-width');
    return saved ? parseInt(saved, 10) : 300;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
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
  const [currentView, setCurrentView] = useState('home'); // 'home', 'files', 'templates', 'recent', 'starred', 'search'
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [currentSpace, setCurrentSpace] = useState(() => {
    return localStorage.getItem('architecture-artifacts-current-space') || null;
  });
  const [isCurrentSpaceReadonly, setIsCurrentSpaceReadonly] = useState(false);

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

  // Check if current space is readonly
  useEffect(() => {
    const checkSpaceAccess = async () => {
      if (isAuthenticated && currentSpace) {
        try {
          const spaces = await fetchUserSpaces();
          const spaceInfo = spaces.find(space => space.space === currentSpace);
          setIsCurrentSpaceReadonly(spaceInfo?.access === 'readonly');
        } catch (error) {
          console.error('Failed to check space access:', error);
          setIsCurrentSpaceReadonly(false);
        }
      } else {
        setIsCurrentSpaceReadonly(false);
      }
    };

    checkSpaceAccess();
  }, [isAuthenticated, currentSpace]);

  // Function to fetch provider info
  const fetchProviderInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/provider-info', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setProviderInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch provider info:', error);
    }
  }, []);

    // Periodic sync with server to catch external changes
  const syncFiles = async () => {
    try {
      const fileTree = await fetchFiles();
      const updatedTree = diffAndUpdateTree(files, fileTree);
      
      // Only update if tree actually changed (silent sync)
      if (JSON.stringify(updatedTree) !== JSON.stringify(files)) {
        setFiles(updatedTree);
      }
    } catch (error) {
      // Silent failure for background sync
      console.warn('Background sync failed:', error);
    }
  };

  // Function to check for draft files from server
  const checkForDrafts = useCallback(async () => {
    // Only check for drafts if provider supports them
    if (!providerInfo.supportsDrafts) {
      setDraftFiles([]);
      setHasChanges(false);
      return;
    }

    try {
      const response = await fetch('/api/drafts', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setDraftFiles(data.drafts || []);
        setHasChanges(data.drafts && data.drafts.length > 0);
      }
    } catch (error) {
      console.error('Failed to check for drafts:', error);
    }
  }, [providerInfo.supportsDrafts]);

  // Function to check for remote sync status
  const checkSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sync-status', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.lastSync && data.lastSync !== lastSyncCheck) {
          // Remote changes were pulled, trigger immediate sync
          console.log('Remote changes detected, syncing file tree...');
          setLastSyncCheck(data.lastSync);
          await syncFiles(); // Immediate sync
        }
      }
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  }, [lastSyncCheck, syncFiles]);

  // Set up periodic sync to catch external changes and check for drafts
  useEffect(() => {
    if (isAuthenticated && files.length > 0) {
      const syncInterval = setInterval(syncFiles, 30000); // Sync every 30 seconds
      const syncStatusInterval = setInterval(checkSyncStatus, 5000); // Check for remote changes every 5 seconds
      
      // Only set up draft polling if provider supports drafts
      let draftInterval;
      if (providerInfo.supportsDrafts) {
        draftInterval = setInterval(checkForDrafts, 5000); // Check for drafts every 5 seconds
      }
      
      return () => {
        clearInterval(syncInterval);
        clearInterval(syncStatusInterval);
        if (draftInterval) clearInterval(draftInterval);
      };
    }
  }, [isAuthenticated, files.length, providerInfo.supportsDrafts, checkForDrafts, checkSyncStatus]);

  // Fetch provider info when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProviderInfo();
    }
  }, [isAuthenticated, fetchProviderInfo]);

  // Initial draft check when authenticated and provider info is loaded
  useEffect(() => {
    if (isAuthenticated && providerInfo) {
      checkForDrafts();
    }
  }, [isAuthenticated, providerInfo, checkForDrafts]);

  // Tree manipulation utilities for local updates
  const findNodeInTree = (tree, path) => {
    for (const node of tree) {
      if (node.path === path) {
        return node;
      }
      if (node.type === 'directory' && node.children) {
        const found = findNodeInTree(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const findParentInTree = (tree, childPath) => {
    const pathParts = childPath.split('/');
    if (pathParts.length === 1) return null; // Root level
    
    const parentPath = pathParts.slice(0, -1).join('/');
    return findNodeInTree(tree, parentPath);
  };

  const addNodeToTree = (tree, newNode, parentPath = null) => {
    const newTree = JSON.parse(JSON.stringify(tree)); // Deep clone
    
    if (!parentPath) {
      // Add to root level
      newTree.push(newNode);
      return sortTree(newTree);
    }
    
    const parent = findNodeInTree(newTree, parentPath);
    if (parent && parent.type === 'directory') {
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(newNode);
      parent.children = sortTree(parent.children);
    } else {
      // If parent not found, try to create parent structure or add to root
      console.warn(`Parent path ${parentPath} not found, adding to root`);
      newTree.push(newNode);
      return sortTree(newTree);
    }
    
    return newTree;
  };

  const removeNodeFromTree = (tree, targetPath) => {
    const newTree = JSON.parse(JSON.stringify(tree)); // Deep clone
    
    const removeFromLevel = (nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].path === targetPath) {
          nodes.splice(i, 1);
          return true;
        }
        if (nodes[i].type === 'directory' && nodes[i].children) {
          if (removeFromLevel(nodes[i].children)) {
            return true;
          }
        }
      }
      return false;
    };
    
    removeFromLevel(newTree);
    return newTree;
  };

  const updateNodeInTree = (tree, targetPath, updates) => {
    const newTree = JSON.parse(JSON.stringify(tree)); // Deep clone
    
    const updateInLevel = (nodes) => {
      for (const node of nodes) {
        if (node.path === targetPath) {
          Object.assign(node, updates);
          return true;
        }
        if (node.type === 'directory' && node.children) {
          if (updateInLevel(node.children)) {
            return true;
          }
        }
      }
      return false;
    };
    
    updateInLevel(newTree);
    return newTree;
  };

  const sortTree = (nodes) => {
    return [...nodes].sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const loadFiles = async (force = false, spaceOverride = null) => {
    try {
      setIsLoading(true);
      const space = spaceOverride || currentSpace;
      const fileTree = await fetchFiles(space);
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

  // Incremental tree update algorithm to preserve UI state
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

    // Perform incremental update
    return mergeTreeChanges(oldTree, newTree, oldMap, newMap);
  };

  // Merge only the changes between old and new trees
  const mergeTreeChanges = (oldTree, newTree, oldMap, newMap) => {
    const updatedTree = JSON.parse(JSON.stringify(oldTree)); // Deep clone old tree
    
    // Track paths that exist in new tree
    const newPaths = new Set(Object.keys(newMap));
    const oldPaths = new Set(Object.keys(oldMap));
    
    // Find added and modified items
    const addedPaths = [...newPaths].filter(path => !oldPaths.has(path));
    const removedPaths = [...oldPaths].filter(path => !newPaths.has(path));
    const potentiallyModified = [...newPaths].filter(path => oldPaths.has(path));
    
    // Remove deleted items
    removedPaths.forEach(removedPath => {
      removeNodeFromTreeByPath(updatedTree, removedPath);
    });
    
    // Add new items and update modified ones
    addedPaths.forEach(addedPath => {
      const newItem = findNodeInTreeByPath(newTree, addedPath);
      if (newItem) {
        addNodeToTreeByPath(updatedTree, newItem, addedPath);
      }
    });
    
    // Check for modifications (size, mtime changes, etc.)
    potentiallyModified.forEach(path => {
      const oldItem = oldMap[path];
      const newItem = newMap[path];
      
      // Check if item actually changed (compare relevant properties)
      if (hasItemChanged(oldItem, newItem)) {
        const fullNewItem = findNodeInTreeByPath(newTree, path);
        if (fullNewItem) {
          updateNodeInTreeByPath(updatedTree, path, fullNewItem);
        }
      }
    });
    
    return sortTree(updatedTree);
  };

  // Helper function to check if an item has actually changed
  const hasItemChanged = (oldItem, newItem) => {
    if (!oldItem || !newItem) return true;
    
    // Compare relevant properties that indicate real changes
    return (
      oldItem.type !== newItem.type ||
      oldItem.name !== newItem.name ||
      oldItem.path !== newItem.path
      // Note: We don't compare mtime here as it causes too many false positives
    );
  };

  // Helper function to find a node in tree by path
  const findNodeInTreeByPath = (tree, targetPath) => {
    for (const node of tree) {
      if (node.path === targetPath) {
        return node;
      }
      if (node.type === 'directory' && node.children) {
        const found = findNodeInTreeByPath(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper function to add a node to tree by path
  const addNodeToTreeByPath = (tree, newNode, targetPath) => {
    const pathParts = targetPath.split('/');
    if (pathParts.length === 1) {
      // Root level item
      tree.push(newNode);
      return;
    }
    
    // Find parent and add to it
    const parentPath = pathParts.slice(0, -1).join('/');
    const parent = findNodeInTreeByPath(tree, parentPath);
    if (parent && parent.type === 'directory') {
      if (!parent.children) parent.children = [];
      parent.children.push(newNode);
    }
  };

  // Helper function to update a node in tree by path
  const updateNodeInTreeByPath = (tree, targetPath, updatedNode) => {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].path === targetPath) {
        // Preserve children if it's a directory
        if (tree[i].type === 'directory' && tree[i].children) {
          updatedNode.children = tree[i].children;
        }
        tree[i] = updatedNode;
        return true;
      }
      if (tree[i].type === 'directory' && tree[i].children) {
        if (updateNodeInTreeByPath(tree[i].children, targetPath, updatedNode)) {
          return true;
        }
      }
    }
    return false;
  };

  // Helper function to remove a node from tree by path
  const removeNodeFromTreeByPath = (tree, targetPath) => {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].path === targetPath) {
        tree.splice(i, 1);
        return true;
      }
      if (tree[i].type === 'directory' && tree[i].children) {
        if (removeNodeFromTreeByPath(tree[i].children, targetPath)) {
          return true;
        }
      }
    }
    return false;
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
      const data = await fetchFile(filePath, currentSpace);
      setSelectedFile(filePath);
      setFileData(data);
      setFileContent(data.content || '');
      setHasChanges(false);
      
      // Check if this is a template file and set editing state
      setIsEditingTemplate(filePath.startsWith('templates/'));
      
      // Switch to files view to show the editor (from any view)
      if (currentView !== 'files') {
        setCurrentView('files');
      }
      
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
        await saveFile(selectedFile, fileContent, currentSpace);
        setHasChanges(false);
        toast.success('File saved successfully');
      }
      
      // Check for drafts after saving
      if (providerInfo.supportsDrafts) {
        checkForDrafts();
      }
    } catch (error) {
      toast.error('Failed to save file');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = (result) => {
    // This is called after successful publish from the modal
    setShowPublishModal(false);
    setHasChanges(false);
    setDraftFiles([]); // Clear draft files after publishing
    loadFiles(true); // Force refresh after publishing
  };

  const handlePublishUpdate = () => {
    loadFiles(true); // Force refresh after publishing
    setSelectedFile(null);
    setFileContent('');
    setFileData(null);
    setHasChanges(false);
    setDraftFiles([]); // Clear draft files after publishing
    setExpandedFolders(new Set()); // Reset expanded folders after publishing
  };

  const handleCreateFolder = async (folderPath) => {
    // Optimistic update - add folder to tree immediately
    const pathParts = folderPath.split('/');
    const folderName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
    
    const newFolder = {
      name: folderName,
      type: 'directory',
      path: folderPath,
      children: []
    };
    
    // Update tree locally first
    const updatedTree = addNodeToTree(files, newFolder, parentPath);
    setFiles(updatedTree);
    
    // Expand all parent folders of the newly created folder  
    const newExpanded = new Set(expandedFolders);
    for (let i = 0; i < pathParts.length; i++) {
      const parentPath = pathParts.slice(0, i + 1).join('/');
      newExpanded.add(parentPath);
    }
    setExpandedFolders(newExpanded);
    
    try {
      // Make API call to persist on server
      await createFolder(folderPath, currentSpace);
      toast.success('Folder created successfully');
    } catch (error) {
      // Rollback on error - remove the folder from tree
      setFiles(files);
      toast.error('Failed to create folder');
    }
  };

  const handleCreateFile = async (filePath, templateContent = '') => {
    // Optimistic update - add file to tree immediately
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
    
    const newFile = {
      name: fileName,
      type: 'file',
      path: filePath,
      fileType: 'markdown' // Assume markdown for now
    };
    
    // Update tree locally first
    const updatedTree = addNodeToTree(files, newFile, parentPath);
    setFiles(updatedTree);
    
    // Expand all parent folders of the newly created file
    const newExpanded = new Set(expandedFolders);
    for (let i = 0; i < pathParts.length - 1; i++) {
      const parentPath = pathParts.slice(0, i + 1).join('/');
      newExpanded.add(parentPath);
    }
    setExpandedFolders(newExpanded);
    
    try {
      // Make API call to persist on server
      await createFile(filePath, templateContent, currentSpace);
      toast.success('File created successfully');
      // Automatically open the newly created file
      await handleFileSelect(filePath);
      
      // Check for drafts after creating file
      if (providerInfo.supportsDrafts) {
        checkForDrafts();
      }
    } catch (error) {
      // Rollback on error - remove the file from tree
      setFiles(files);
      toast.error('Failed to create file');
    }
  };

  const handleDeleteItem = async (itemPath) => {
    // Store original tree for rollback
    const originalTree = files;
    
    // Optimistic update - remove item from tree immediately
    const updatedTree = removeNodeFromTree(files, itemPath);
    setFiles(updatedTree);
    
    // If the deleted item was the currently selected file, clear the selection
    if (selectedFile === itemPath) {
      setSelectedFile(null);
      setFileContent('');
      setFileData(null);
      setHasChanges(false);
    }
    
    try {
      // Make API call to persist on server
      await deleteItem(itemPath, currentSpace);
      toast.success('Item deleted successfully');
      
      // Check for drafts after deleting item
      if (providerInfo.supportsDrafts) {
        checkForDrafts();
      }
    } catch (error) {
      // Rollback on error - restore original tree
      setFiles(originalTree);
      toast.error('Failed to delete item');
    }
  };

  const handleRenameItem = async (itemPath, newName) => {
    // Store original tree for rollback
    const originalTree = files;
    
    // Calculate new path
    const pathParts = itemPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');
    
    // Optimistic update - rename item in tree immediately
    const updatedTree = updateNodeInTree(files, itemPath, {
      name: newName,
      path: newPath
    });
    setFiles(updatedTree);
    
    // If the renamed item was the currently selected file, update the selection
    if (selectedFile === itemPath) {
      setSelectedFile(newPath);
    }
    
    try {
      // Make API call to persist on server
      const result = await renameItem(itemPath, newName, currentSpace);
      toast.success('Item renamed successfully');
    } catch (error) {
      // Rollback on error - restore original tree and selection
      setFiles(originalTree);
      if (selectedFile === newPath) {
        setSelectedFile(itemPath);
      }
      toast.error('Failed to rename item');
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
      localStorage.setItem('architecture-artifacts-sidebar-width', newWidth.toString());
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


  const handleFileUpload = useCallback(async (filePath) => {
    // Optimistic update - add uploaded file to tree immediately
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
    
    // Detect file type from extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    let fileType = 'unknown';
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(`.${extension}`)) {
      fileType = 'image';
    } else if (extension === 'pdf') {
      fileType = 'pdf';
    } else if (['.txt', '.json', '.xml', '.csv', '.log', '.js', '.ts', '.css', '.html'].includes(`.${extension}`)) {
      fileType = 'text';
    } else if (['.md', '.markdown'].includes(`.${extension}`)) {
      fileType = 'markdown';
    }
    
    const newFile = {
      name: fileName,
      type: 'file',
      path: filePath,
      fileType: fileType
    };
    
    // Update tree locally
    const updatedTree = addNodeToTree(files, newFile, parentPath);
    setFiles(updatedTree);
    
    toast.success('File uploaded successfully');
    
    // Check for drafts after uploading file
    if (providerInfo.supportsDrafts) {
      checkForDrafts();
    }
  }, [files, providerInfo.supportsDrafts, checkForDrafts]);

  const handleFolderToggle = useCallback((folderPath, isExpanded) => {
    const newExpanded = new Set(expandedFolders);
    if (isExpanded) {
      newExpanded.add(folderPath);
    } else {
      newExpanded.delete(folderPath);
    }
    setExpandedFolders(newExpanded);
  }, [expandedFolders]);

  const loadTemplates = async (spaceOverride = null) => {
    try {
      setIsTemplatesLoading(true);
      const space = spaceOverride || currentSpace;
      const templatesData = await fetchTemplates(space);
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
      // Return to templates list view after creating
      setCurrentView('templates');
      setIsEditingTemplate(false);
    } catch (error) {
      throw error;
    }
  };

  const handleTemplateEdit = async (templateName, templateData) => {
    try {
      await updateTemplate(templateName, templateData);
      await loadTemplates();
      // Return to templates list view after editing
      setCurrentView('templates');
      setIsEditingTemplate(false);
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
      setCurrentView('files'); // Switch to files view to show the editor
      setIsEditingTemplate(true);
      setSelectedFile(`templates/${template.name}`);
      setFileContent(template.content || '');
      setFileData({
        content: template.content || '',
        path: `templates/${template.name}`,
        fileType: 'markdown',
        isTemplate: true
      });
      setHasChanges(false);
    } else if (action === 'view') {
      // Show templates list view
      setCurrentView('templates');
      setIsEditingTemplate(false);
      setSelectedFile(null);
      setFileContent('');
      setFileData(null);
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
      setShowSearchResults(false); // Hide dropdown
      setCurrentView('search'); // Switch to search results view
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

  const handleViewChange = (view) => {
    setCurrentView(view);
    // Clear selected file when switching to special views
    if (view === 'recent' || view === 'starred' || view === 'search' || view === 'home') {
      setSelectedFile(null);
      setFileContent('');
      setFileData(null);
      setHasChanges(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setSearchResults([]);
    setShowSearchResults(false);
    setCurrentView('files');
  };

  const handleSpaceChange = (newSpace) => {
    setCurrentSpace(newSpace);
    localStorage.setItem('architecture-artifacts-current-space', newSpace);
    
    // Clear current file selection and content when switching spaces
    setSelectedFile(null);
    setFileContent('');
    setFileData(null);
    setHasChanges(false);
    
    // Reload files and templates for the new space
    loadFiles(false, newSpace);
    loadTemplates(newSpace);
    
    // Show success message
    toast.success(`Switched to ${newSpace} space`);
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
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
              <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 22V12" stroke="#0052cc" strokeWidth="2"/>
              <path d="M2 7L12 12L22 7" stroke="#0052cc" strokeWidth="2"/>
            </svg>
            <h4 className="text-confluence-text mb-2">Architecture Artifacts Editor</h4>
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
              
              <button 
                className="btn btn-link navbar-brand fw-medium me-3 d-flex align-items-center text-decoration-none border-0 bg-transparent p-0"
                onClick={() => setCurrentView('home')}
                style={{ cursor: 'pointer' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="me-2">
                  <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M12 22V12" stroke="#0052cc" strokeWidth="2"/>
                  <path d="M2 7L12 12L22 7" stroke="#0052cc" strokeWidth="2"/>
                </svg>
                Architecture Artifacts Editor
              </button>
              
              
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
                    <div className="position-absolute w-100 border rounded-bottom shadow-sm mt-1 search-dropdown" style={{zIndex: 1050, maxHeight: '300px', overflowY: 'auto'}}>
                      {searchSuggestions.length > 0 && (
                        <div>
                          <div className="px-3 py-2 border-bottom small text-muted search-section-header">Files</div>
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
                          <div className="px-3 py-2 border-bottom small text-muted search-section-header">Content Results</div>
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
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setCurrentView('home')}
                  title="Home"
                >
                  <i className="bi bi-house"></i>
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
                      className="btn btn-primary btn-sm me-2"
                      onClick={() => setShowRegisterModal(true)}
                    >
                      Register
                    </button>
                  </>
                )}
                
                <button
                  className="btn btn-outline-secondary btn-sm me-2"
                  onClick={toggleTheme}
                  title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                  <i className={`bi ${isDark ? 'bi-sun' : 'bi-moon'}`}></i>
                </button>
                
                {isAuthenticated && (
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={logout}
                    title="Logout"
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    Logout
                  </button>
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
                draftFiles={draftFiles}
                providerInfo={providerInfo}
                onViewChange={handleViewChange}
                currentSpace={currentSpace}
                onSpaceChange={handleSpaceChange}
                isAuthenticated={isAuthenticated}
                isReadonly={isCurrentSpaceReadonly}
              />
            </div>
            <div className="sidebar-resizer" onMouseDown={handleMouseDown}></div>
          </aside>
        )}

        <section className="editor-section">
          {currentView === 'home' ? (
            <HomeView
              onFileSelect={handleFileSelect}
              onTemplateSelect={handleTemplateSelect}
              isVisible={currentView === 'home'}
              isReadonly={isCurrentSpaceReadonly}
            />
          ) : currentView === 'templates' ? (
            <TemplatesList
              templates={templates}
              onTemplateEdit={handleTemplateEdit}
              onTemplateCreate={handleTemplateCreate}
              onTemplateDelete={handleTemplateDelete}
              onTemplateSelect={handleTemplateSelect}
              isLoading={isTemplatesLoading}
            />
          ) : currentView === 'recent' ? (
            <RecentFilesView
              onFileSelect={handleFileSelect}
              isVisible={currentView === 'recent'}
            />
          ) : currentView === 'starred' ? (
            <StarredFilesView
              onFileSelect={handleFileSelect}
              isVisible={currentView === 'starred'}
            />
          ) : currentView === 'search' ? (
            <SearchResultsView
              onFileSelect={handleFileSelect}
              searchResults={searchResults}
              fileSuggestions={searchSuggestions}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onClearSearch={handleClearSearch}
            />
          ) : (
            <MarkdownEditor
              content={fileContent}
              onChange={handleContentChange}
              fileName={selectedFile}
              isLoading={isFileLoading}
              onRename={handleRenameItem}
              fileData={fileData}
              onSave={handleSave}
              hasChanges={hasChanges}
            />
          )}
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