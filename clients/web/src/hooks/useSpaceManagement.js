/**
 * @fileoverview Custom hook for space management and user authentication.
 * Handles current space state, space switching, and readonly space detection.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchUserSpaces } from '../services/api';
import { constructSpaceURL } from '../utils/urlUtils';

/**
 * Custom hook for managing space state and operations
 */
export function useSpaceManagement(user, isAuthenticated) {
  const navigate = useNavigate();
  
  const [currentSpace, setCurrentSpace] = useState(() => {
    return localStorage.getItem('design-artifacts-current-space') || null;
  });
  const [isCurrentSpaceReadonly, setIsCurrentSpaceReadonly] = useState(false);

  /**
   * Checks if current space has readonly access
   */
  const checkSpaceAccess = useCallback(async () => {
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
  }, [isAuthenticated, currentSpace]);

  /**
   * Handles space change with cleanup
   */
  const handleSpaceChange = useCallback((newSpace) => {
    setCurrentSpace(newSpace);
    localStorage.setItem('design-artifacts-current-space', newSpace);
    
    // Navigate to new space
    navigate(constructSpaceURL(newSpace));
    
    // Show success message
    toast.success(`Switched to ${newSpace} space`);
    
    return true; // Indicates that cleanup is needed
  }, [navigate]);

  /**
   * Updates current space state
   */
  const updateCurrentSpace = useCallback((space) => {
    if (space !== currentSpace) {
      setCurrentSpace(space);
      localStorage.setItem('design-artifacts-current-space', space);
    }
  }, [currentSpace]);

  /**
   * Initializes space when user becomes authenticated
   */
  const initializeUserSpace = useCallback(async (urlSpace) => {
    if (!isAuthenticated) return null;

    try {
      const spaces = await fetchUserSpaces();
      if (spaces && spaces.length > 0) {
        // Check if URL space is valid
        if (urlSpace) {
          const urlSpaceExists = spaces.find(space => space.space === urlSpace);
          if (urlSpaceExists) {
            // URL space is valid, use it
            if (currentSpace !== urlSpace) {
              updateCurrentSpace(urlSpace);
            }
            return urlSpace;
          } else {
            // URL space is invalid, redirect to default space
            const personalSpace = spaces.find(space => space.space === 'Personal');
            const defaultSpace = personalSpace ? personalSpace.space : spaces[0].space;
            updateCurrentSpace(defaultSpace);
            navigate(constructSpaceURL(defaultSpace), { replace: true });
            return defaultSpace;
          }
        } else if (!currentSpace) {
          // No URL space and no current space, use default
          const personalSpace = spaces.find(space => space.space === 'Personal');
          const defaultSpace = personalSpace ? personalSpace.space : spaces[0].space;
          updateCurrentSpace(defaultSpace);
          return defaultSpace;
        }
      }
      return currentSpace;
    } catch (error) {
      console.error('Failed to load user spaces:', error);
      return null;
    }
  }, [isAuthenticated, currentSpace, updateCurrentSpace, navigate]);

  // Check space access when space or authentication changes
  useEffect(() => {
    checkSpaceAccess();
  }, [checkSpaceAccess]);

  return {
    // State
    currentSpace,
    isCurrentSpaceReadonly,
    
    // Actions
    handleSpaceChange,
    updateCurrentSpace,
    initializeUserSpace,
    checkSpaceAccess,
    
    // Direct setters
    setCurrentSpace,
    setIsCurrentSpaceReadonly
  };
}