/**
 * @fileoverview Utility functions for App component operations.
 * Contains helper functions for URL parsing, drafts checking, and sync operations.
 */

import { fetchFiles } from '../services/api';

/**
 * Syncs the local file tree with the server to catch external changes
 */
export async function syncFiles(currentSpace, files, updateFiles) {
  try {
    const fileTree = await fetchFiles(currentSpace);
    const updatedTree = diffAndUpdateTree(files, fileTree);
    
    // Only update if tree actually changed (silent sync)
    if (JSON.stringify(updatedTree) !== JSON.stringify(files)) {
      updateFiles(updatedTree);
    }
  } catch (error) {
    // Silent failure for background sync
    console.warn('Background sync failed:', error);
  }
}

/**
 * Checks for draft files from the server by examining file metadata
 */
export async function checkForDrafts(currentSpace, setDraftFiles, setHasChanges) {
  if (!currentSpace) return;

  try {
    const fileTree = await fetchFiles(currentSpace);
    const draftPaths = [];
    
    // Recursively check all files for draft status
    const checkFileForDrafts = (items) => {
      items.forEach(item => {
        if (item.type === 'file' && item.isDraft) {
          draftPaths.push(item.path);
        } else if (item.type === 'directory' && item.children) {
          checkFileForDrafts(item.children);
        }
      });
    };
    
    checkFileForDrafts(fileTree);
    setDraftFiles(draftPaths);
    setHasChanges(draftPaths.length > 0);
  } catch (error) {
    console.error('Failed to check for drafts:', error);
  }
}

/**
 * Simple diff algorithm for tree comparison
 * TODO: This is a simplified version. The original has more complex logic.
 */
function diffAndUpdateTree(oldTree, newTree) {
  // If first load, return new tree
  if (oldTree.length === 0) {
    return newTree;
  }

  // For now, just return new tree
  // In a full implementation, this would do incremental updates
  return newTree;
}

/**
 * Sets up periodic sync and draft checking intervals
 */
export function setupPeriodicSync(isAuthenticated, files, currentSpace, syncFiles, checkForDrafts) {
  if (isAuthenticated && files.length > 0) {
    const syncInterval = setInterval(() => syncFiles(), 30000); // Sync every 30 seconds
    const draftInterval = setInterval(() => checkForDrafts(), 5000); // Check for drafts every 5 seconds
    
    return () => {
      clearInterval(syncInterval);
      clearInterval(draftInterval);
    };
  }
  return () => {};
}

/**
 * Sets up authentication event listeners
 */
export function setupAuthEventListeners(isAuthenticated, setShowLoginModal) {
  const handleAuthRequired = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  };
  
  window.addEventListener('authRequired', handleAuthRequired);
  return () => window.removeEventListener('authRequired', handleAuthRequired);
}

/**
 * Handles landing page timer and authentication flow
 */
export function setupLandingPageTimer(loading, isAuthenticated, setShowLandingPage, setShowLoginModal) {
  if (!loading) {
    if (isAuthenticated) {
      // If user is authenticated, hide landing page immediately
      setShowLandingPage(false);
    } else {
      // If not authenticated, show landing page for 3 seconds
      const timer = setTimeout(() => {
        setShowLandingPage(false);
        setShowLoginModal(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }
  return () => {};
}

/**
 * Handles outside click for search results
 */
export function setupSearchClickOutside(setShowSearchResults) {
  const handleClickOutside = (event) => {
    if (!event.target.closest('.position-relative')) {
      setShowSearchResults(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}