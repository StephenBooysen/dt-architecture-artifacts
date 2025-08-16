/**
 * @fileoverview Custom hook for UI state management.
 * Handles sidebar, modals, views, and other UI-related state.
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing UI state
 */
export function useUIState() {
  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('design-artifacts-sidebar-width');
    return saved ? parseInt(saved, 10) : 300;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);

  // View state
  const [currentView, setCurrentView] = useState('home');

  // Knowledge view state
  const [isKnowledgeView, setIsKnowledgeView] = useState(false);
  const [knowledgeViewContent, setKnowledgeViewContent] = useState('');
  const [knowledgeViewSelectedFile, setKnowledgeViewSelectedFile] = useState(null);

  /**
   * Handles mouse down for sidebar resizing
   */
  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  /**
   * Handles mouse move for sidebar resizing
   */
  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    const minWidth = 200;
    const maxWidth = 600;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
      localStorage.setItem('design-artifacts-sidebar-width', newWidth.toString());
    }
  }, [isResizing]);

  /**
   * Handles mouse up for sidebar resizing
   */
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  /**
   * Handles view changes with cleanup
   */
  const handleViewChange = useCallback((view) => {
    setCurrentView(view);
    
    // Return whether this is a special view that should clear file selection
    const specialViews = ['recent', 'starred', 'search', 'home', 'new-markdown', 'templates', 'settings'];
    return specialViews.includes(view);
  }, []);

  /**
   * Handles auth modal switches
   */
  const handleSwitchToRegister = useCallback(() => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  }, []);

  const handleSwitchToLogin = useCallback(() => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  }, []);

  /**
   * Resets knowledge view state
   */
  const resetKnowledgeView = useCallback(() => {
    setIsKnowledgeView(false);
    setKnowledgeViewContent('');
    setKnowledgeViewSelectedFile(null);
  }, []);

  /**
   * Sets up knowledge view
   */
  const setupKnowledgeView = useCallback((content = '', selectedFile = null) => {
    setIsKnowledgeView(true);
    setCurrentView('knowledge');
    setKnowledgeViewContent(content);
    setKnowledgeViewSelectedFile(selectedFile);
  }, []);

  // Effect for sidebar resizing event listeners
  useEffect(() => {
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

  return {
    // Sidebar state
    sidebarWidth,
    setSidebarWidth,
    isResizing,
    setIsResizing,
    sidebarCollapsed,
    setSidebarCollapsed,
    handleMouseDown,

    // Modal state
    showPublishModal,
    setShowPublishModal,
    showLoginModal,
    setShowLoginModal,
    showRegisterModal,
    setShowRegisterModal,
    showLandingPage,
    setShowLandingPage,
    handleSwitchToRegister,
    handleSwitchToLogin,

    // View state
    currentView,
    setCurrentView,
    handleViewChange,

    // Knowledge view state
    isKnowledgeView,
    setIsKnowledgeView,
    knowledgeViewContent,
    setKnowledgeViewContent,
    knowledgeViewSelectedFile,
    setKnowledgeViewSelectedFile,
    resetKnowledgeView,
    setupKnowledgeView
  };
}