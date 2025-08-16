/**
 * @fileoverview Custom hook for file tree management and operations.
 * Handles file tree state, CRUD operations, and tree manipulation utilities.
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  fetchFiles,
  createFolder,
  createFile,
  deleteItem,
  renameItem
} from '../services/api';

/**
 * Custom hook for managing file tree state and operations
 */
export function useFileTree(currentSpace) {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  /**
   * Finds a node in the file tree by its path
   */
  const findNodeInTree = useCallback((tree, path) => {
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
  }, []);

  /**
   * Sorts tree nodes with directories first, then alphabetically
   */
  const sortTree = useCallback((nodes) => {
    return [...nodes].sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  }, []);

  /**
   * Adds a new node to the file tree at the specified parent location
   */
  const addNodeToTree = useCallback((tree, newNode, parentPath = null) => {
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
      // If parent not found, add to root
      console.warn(`Parent path ${parentPath} not found, adding to root`);
      newTree.push(newNode);
      return sortTree(newTree);
    }
    
    return newTree;
  }, [findNodeInTree, sortTree]);

  /**
   * Removes a node from the file tree
   */
  const removeNodeFromTree = useCallback((tree, targetPath) => {
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
  }, []);

  /**
   * Updates a node in the file tree
   */
  const updateNodeInTree = useCallback((tree, targetPath, updates) => {
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
  }, []);

  /**
   * Creates a map representation of the tree for fast lookup
   */
  const createTreeMap = useCallback((tree) => {
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
  }, []);

  /**
   * Incremental tree update algorithm to preserve UI state during updates
   */
  const diffAndUpdateTree = useCallback((oldTree, newTree) => {
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

    // For now, return new tree (full implementation would merge changes)
    return newTree;
  }, [createTreeMap]);

  /**
   * Loads the file tree from the server
   */
  const loadFiles = useCallback(async (force = false, spaceOverride = null) => {
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
      console.error('Failed to load files:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [currentSpace, files, diffAndUpdateTree]);

  /**
   * Creates a new folder
   */
  const handleCreateFolder = useCallback(async (folderPath) => {
    const pathParts = folderPath.split('/');
    const folderName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
    
    const newFolder = {
      name: folderName,
      type: 'directory',
      path: folderPath,
      children: []
    };
    
    // Update tree locally first (optimistic update)
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
  }, [files, expandedFolders, addNodeToTree, currentSpace]);

  /**
   * Creates a new file
   */
  const handleCreateFile = useCallback(async (filePath, templateContent = '') => {
    const pathParts = filePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
    
    const newFile = {
      name: fileName,
      type: 'file',
      path: filePath,
      fileType: 'markdown' // Assume markdown for now
    };
    
    // Update tree locally first (optimistic update)
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
      return filePath; // Return the file path for further processing
    } catch (error) {
      // Rollback on error - remove the file from tree
      setFiles(files);
      toast.error('Failed to create file');
      throw error;
    }
  }, [files, expandedFolders, addNodeToTree, currentSpace]);

  /**
   * Deletes a file or folder
   */
  const handleDeleteItem = useCallback(async (itemPath) => {
    // Store original tree for rollback
    const originalTree = files;
    
    // Optimistic update - remove item from tree immediately
    const updatedTree = removeNodeFromTree(files, itemPath);
    setFiles(updatedTree);
    
    try {
      // Make API call to persist on server
      await deleteItem(itemPath, currentSpace);
      toast.success('Item deleted successfully');
      return true; // Return success for further processing
    } catch (error) {
      // Rollback on error - restore original tree
      setFiles(originalTree);
      toast.error('Failed to delete item');
      return false;
    }
  }, [files, removeNodeFromTree, currentSpace]);

  /**
   * Renames a file or folder
   */
  const handleRenameItem = useCallback(async (itemPath, newName) => {
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
    
    try {
      // Make API call to persist on server
      await renameItem(itemPath, newName, currentSpace);
      toast.success('Item renamed successfully');
      return newPath; // Return new path for further processing
    } catch (error) {
      // Rollback on error - restore original tree
      setFiles(originalTree);
      toast.error('Failed to rename item');
      throw error;
    }
  }, [files, updateNodeInTree, currentSpace]);

  /**
   * Handles folder toggle (expand/collapse)
   */
  const handleFolderToggle = useCallback((folderPath, isExpanded) => {
    const newExpanded = new Set(expandedFolders);
    if (isExpanded) {
      newExpanded.add(folderPath);
    } else {
      newExpanded.delete(folderPath);
    }
    setExpandedFolders(newExpanded);
  }, [expandedFolders]);

  /**
   * Handles file upload by adding it to the tree
   */
  const handleFileUpload = useCallback((filePath) => {
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
  }, [files, addNodeToTree]);

  return {
    // State
    files,
    isLoading,
    expandedFolders,
    
    // Actions
    loadFiles,
    handleCreateFolder,
    handleCreateFile,
    handleDeleteItem,
    handleRenameItem,
    handleFolderToggle,
    handleFileUpload,
    
    // Utilities
    findNodeInTree,
    setFiles,
    setExpandedFolders
  };
}