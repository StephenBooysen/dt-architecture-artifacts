/**
 * @fileoverview Main application header component.
 * Contains navigation, search, user info, and theme controls.
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { constructFileURL } from '../utils/urlUtils';

/**
 * AppHeader component with search, user info, and controls
 */
function AppHeader({
  // Search props
  searchQuery,
  onSearchChange,
  onSearchKeyDown,
  onSearchSubmit,
  showSearchResults,
  searchSuggestions,
  searchResults,
  onSearchResultClick,
  setShowSearchResults,
  highlightedIndex,
  setHighlightedIndex,
  currentSpace,
  isKnowledgeView,
  
  // UI props
  sidebarCollapsed,
  setSidebarCollapsed,
  onViewChange,
  
  // Auth props
  setShowLoginModal,
  setShowRegisterModal,
  onAuthSuccess,
  handleSwitchToRegister,
  handleSwitchToLogin
}) {
  const { user, logout, isAuthenticated } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  return (
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
              onClick={() => onViewChange('home')}
              style={{ cursor: 'pointer' }}
            >
              <img src="/stech-black.png" alt="Design Artifacts" width="20" height="20" className="me-2" />
              Design Artifacts Editor
            </button>
            
            <div className="flex-grow-1 me-3">
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-sm pe-5"
                  placeholder="Search files and content..."
                  value={searchQuery}
                  onChange={onSearchChange}
                  onKeyDown={onSearchKeyDown}
                  onFocus={() => setShowSearchResults(true)}
                />
                <button 
                  className="btn btn-sm btn-outline-secondary position-absolute top-50 end-0 translate-middle-y me-1"
                  style={{border: 'none', padding: '0.25rem 0.5rem'}}
                  onClick={onSearchSubmit}
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
                            className={`px-3 py-2 cursor-pointer border-bottom search-suggestion ${highlightedIndex === index ? 'highlighted' : ''}`}
                            onClick={() => {
                              if (isKnowledgeView) {
                                onSearchResultClick(file);
                              } else {
                                const fileURL = constructFileURL(currentSpace, file.path);
                                window.location.href = fileURL;
                                setShowSearchResults(false);
                              }
                            }}
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
                            onClick={() => onSearchResultClick(result)}
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
              {isAuthenticated ? (
                <>
                  <div 
                    className="d-flex align-items-center me-3 cursor-pointer" 
                    onClick={() => onViewChange('settings')}
                    title="Click to open user settings"
                    style={{ cursor: 'pointer' }}
                  >
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
  );
}

export default AppHeader;