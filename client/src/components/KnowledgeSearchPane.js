/**
 * @fileoverview Knowledge view search results pane component
 * 
 * Provides the left navigation pane for knowledge view mode including:
 * - Initial prompt to search for content
 * - Search results display with file and content matches
 * - Result selection and navigation
 * - Clean, focused interface for readonly spaces
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

import React, { useState, useEffect } from 'react';
import { fetchUserSpaces } from '../services/api';

/**
 * KnowledgeSearchPane component for displaying search results in knowledge view.
 * @param {Object} props - Component properties.
 * @param {Array} props.searchResults - Array of search results.
 * @param {Function} props.onResultSelect - Callback for result selection.
 * @param {string} props.searchQuery - Current search query.
 * @param {Object} props.selectedFile - Currently selected file info.
 * @param {boolean} props.isLoading - Whether search is in progress.
 * @param {string} props.currentSpace - Currently selected space.
 * @param {Function} props.onSpaceChange - Callback for space changes.
 * @param {boolean} props.isAuthenticated - Whether user is authenticated.
 * @return {JSX.Element} The KnowledgeSearchPane component.
 */
const KnowledgeSearchPane = ({
  searchResults = [],
  onResultSelect,
  searchQuery = '',
  selectedFile = null,
  isLoading = false,
  currentSpace,
  onSpaceChange,
  isAuthenticated
}) => {
  const [spaces, setSpaces] = useState([]);

  // Load spaces when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSpaces();
    }
  }, [isAuthenticated]);

  const loadSpaces = async () => {
    try {
      const userSpaces = await fetchUserSpaces();
      setSpaces(userSpaces);
    } catch (error) {
      console.error('Error loading spaces:', error);
      setSpaces([]);
    }
  };

  const getSpaceIcon = (space) => {
    if (space.space === 'Personal') return 'bi-person';
    if (space.filing?.type === 'git') return 'bi-git';
    if (space.access === 'readonly') return 'bi-eye';
    return 'bi-collection';
  };
  
  const handleResultClick = (result) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  // Show initial prompt when no search has been performed
  if (!searchQuery && searchResults.length === 0) {
    return (
      <div className="knowledge-search-pane">
        <div className="knowledge-search-header">
          <div className="d-flex align-items-center">
            <i className="bi bi-search me-2 text-primary"></i>
            <h6 className="mb-0 text-confluence-text">Knowledge Search</h6>
          </div>
        </div>
        
        <div className="knowledge-search-content">
          <div className="knowledge-prompt">
            <div className="text-center py-5">
              <i className="bi bi-lightbulb text-muted mb-3" style={{fontSize: '2rem'}}></i>
              <p className="text-muted mb-0">
                Please type a search term to find content
              </p>
              <small className="text-muted">
                Search through files and their content to discover knowledge
              </small>
            </div>
          </div>
        </div>
        
        {/* Spaces Navigation */}
        {isAuthenticated && spaces.length > 0 && (
          <div className="knowledge-spaces-nav">
            <div className="spaces-nav-header">
              <h6 className="mb-0 text-confluence-text">
                <i className="bi bi-collection me-2"></i>
                Spaces
              </h6>
            </div>
            <div className="spaces-nav-content">
              {spaces.map((space) => (
                <div 
                  key={space.space}
                  className={`nav-option d-flex align-items-center justify-content-between p-2 rounded cursor-pointer mt-1 ${currentSpace === space.space ? 'active' : ''}`}
                  onClick={() => onSpaceChange && onSpaceChange(space.space)}
                  style={{
                    cursor: 'pointer', 
                    backgroundColor: currentSpace === space.space 
                      ? 'var(--confluence-primary-light, rgba(0, 82, 204, 0.1))' 
                      : 'var(--nav-option-bg, transparent)'
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
          </div>
        )}
        
        <style jsx>{`
          .knowledge-search-pane {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--confluence-bg-card);
          }
          
          .knowledge-search-header {
            padding: 1rem;
            border-bottom: 1px solid var(--confluence-border);
            background: var(--confluence-border-subtle);
          }
          
          .knowledge-search-content {
            flex: 1;
            overflow-y: auto;
          }
          
          .knowledge-prompt {
            padding: 2rem 1rem;
          }
        `}</style>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="knowledge-search-pane">
        <div className="knowledge-search-header">
          <div className="d-flex align-items-center">
            <i className="bi bi-search me-2 text-primary"></i>
            <h6 className="mb-0 text-confluence-text">Knowledge Search</h6>
          </div>
        </div>
        
        <div className="knowledge-search-content">
          <div className="knowledge-loading">
            <div className="text-center py-4">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Searching...</span>
              </div>
              <p className="text-muted mb-0">Searching knowledge base...</p>
            </div>
          </div>
        </div>
        
        {/* Spaces Navigation */}
        {isAuthenticated && spaces.length > 0 && (
          <div className="knowledge-spaces-nav">
            <div className="spaces-nav-header">
              <h6 className="mb-0 text-confluence-text">
                <i className="bi bi-collection me-2"></i>
                Spaces
              </h6>
            </div>
            <div className="spaces-nav-content">
              {spaces.map((space) => (
                <div 
                  key={space.space}
                  className={`nav-option d-flex align-items-center justify-content-between p-2 rounded cursor-pointer mt-1 ${currentSpace === space.space ? 'active' : ''}`}
                  onClick={() => onSpaceChange && onSpaceChange(space.space)}
                  style={{
                    cursor: 'pointer', 
                    backgroundColor: currentSpace === space.space 
                      ? 'var(--confluence-primary-light, rgba(0, 82, 204, 0.1))' 
                      : 'var(--nav-option-bg, transparent)'
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
          </div>
        )}
        
        <style jsx>{`
          .knowledge-search-pane {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--confluence-bg-card);
          }
          
          .knowledge-search-header {
            padding: 1rem;
            border-bottom: 1px solid var(--confluence-border);
            background: var(--confluence-border-subtle);
          }
          
          .knowledge-search-content {
            flex: 1;
            overflow-y: auto;
          }
          
          .knowledge-loading {
            padding: 2rem 1rem;
          }
        `}</style>
      </div>
    );
  }

  // Show search results
  return (
    <div className="knowledge-search-pane">
      <div className="knowledge-search-header">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <i className="bi bi-search me-2 text-primary"></i>
            <h6 className="mb-0 text-confluence-text">Search Results</h6>
          </div>
          <span className="badge bg-light text-dark">{searchResults.length}</span>
        </div>
        {searchQuery && (
          <div className="search-query-display">
            <small className="text-muted">Results for: "{searchQuery}"</small>
          </div>
        )}
      </div>
      
      <div className="knowledge-search-content">
        {searchResults.length === 0 ? (
          <div className="no-results">
            <div className="text-center py-4">
              <i className="bi bi-search text-muted mb-3" style={{fontSize: '1.5rem'}}></i>
              <p className="text-muted mb-0">No results found</p>
              <small className="text-muted">Try different search terms</small>
            </div>
          </div>
        ) : (
          <div className="results-list">
            {searchResults.map((result, index) => (
              <div
                key={`${result.path}-${index}`}
                className={`result-item ${selectedFile?.path === result.path ? 'selected' : ''}`}
                onClick={() => handleResultClick(result)}
              >
                <div className="result-header">
                  <div className="result-icon">
                    {result.type === 'content' ? (
                      <i className="bi bi-file-text text-primary"></i>
                    ) : result.type === 'both' ? (
                      <i className="bi bi-file-richtext text-success"></i>
                    ) : (
                      <i className="bi bi-file-earmark text-secondary"></i>
                    )}
                  </div>
                  <div className="result-title">
                    <div className="title-text">{result.title}</div>
                    <div className="result-path">{result.path}</div>
                  </div>
                </div>
                
                {result.preview && (
                  <div className="result-preview">
                    <div dangerouslySetInnerHTML={{__html: result.preview}} />
                  </div>
                )}
                
                {result.type && (
                  <div className="result-type">
                    <small className="badge bg-light text-dark">
                      {result.type === 'content' ? 'Content Match' : 'File Match'}
                    </small>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Spaces Navigation */}
      {isAuthenticated && spaces.length > 0 && (
        <div className="knowledge-spaces-nav">
          <div className="spaces-nav-header">
            <h6 className="mb-0 text-confluence-text">
              <i className="bi bi-collection me-2"></i>
              Spaces
            </h6>
          </div>
          <div className="spaces-nav-content">
            {spaces.map((space) => (
              <div 
                key={space.space}
                className={`nav-option d-flex align-items-center justify-content-between p-2 rounded cursor-pointer mt-1 ${currentSpace === space.space ? 'active' : ''}`}
                onClick={() => onSpaceChange && onSpaceChange(space.space)}
                style={{
                  cursor: 'pointer', 
                  backgroundColor: currentSpace === space.space 
                    ? 'var(--confluence-primary-light, rgba(0, 82, 204, 0.1))' 
                    : 'var(--nav-option-bg, transparent)'
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
        </div>
      )}
      
      <style jsx>{`
        .knowledge-search-pane {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--confluence-bg-card);
        }
        
        .knowledge-search-header {
          padding: 1rem;
          border-bottom: 1px solid var(--confluence-border);
          background: var(--confluence-border-subtle);
        }
        
        .search-query-display {
          margin-top: 0.5rem;
        }
        
        .knowledge-search-content {
          flex: 1;
          overflow-y: auto;
        }
        
        .no-results {
          padding: 2rem 1rem;
        }
        
        .results-list {
          padding: 0;
        }
        
        .result-item {
          padding: 1rem;
          border-bottom: 1px solid var(--confluence-border);
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--confluence-bg-card);
        }
        
        .result-item:hover {
          background: var(--confluence-border-subtle);
        }
        
        .result-item.selected {
          background: #e6f3ff;
          border-left: 3px solid var(--confluence-primary);
        }
        
        .result-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .result-icon {
          font-size: 1rem;
          margin-top: 0.1rem;
        }
        
        .result-title {
          flex: 1;
          min-width: 0;
        }
        
        .title-text {
          font-weight: 500;
          color: var(--confluence-text);
          margin-bottom: 0.25rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .result-path {
          font-size: 0.75rem;
          color: var(--confluence-text-subtle);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .result-preview {
          margin-left: 1.75rem;
          font-size: 0.875rem;
          color: var(--confluence-text-subtle);
          line-height: 1.4;
          margin-bottom: 0.5rem;
        }
        
        .result-preview :global(mark) {
          background: #fff3cd;
          padding: 0.1rem 0.2rem;
          border-radius: 2px;
        }
        
        .result-type {
          margin-left: 1.75rem;
        }
        
        .result-type .badge {
          font-size: 0.7rem;
        }
        
        .knowledge-spaces-nav {
          border-top: 1px solid var(--confluence-border);
          background: var(--confluence-bg-card);
        }
        
        .spaces-nav-header {
          padding: 1rem;
          background: var(--confluence-border-subtle);
          border-bottom: 1px solid var(--confluence-border);
        }
        
        .spaces-nav-content {
          padding: 1rem;
        }
        
        .nav-option {
          transition: background-color 0.2s ease;
          border: 1px solid transparent;
        }
        
        .nav-option:hover {
          border-color: var(--confluence-border);
        }
        
        .nav-option.active {
          border-color: var(--confluence-primary);
          background-color: var(--confluence-primary-light, rgba(0, 82, 204, 0.1));
        }
      `}</style>
    </div>
  );
};

export default KnowledgeSearchPane;