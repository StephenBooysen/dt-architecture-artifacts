/**
 * @fileoverview Search results view component for Architecture Artifacts.
 * 
 * This component displays search results in a list format similar to recent and starred files.
 * It shows both file name matches and content matches with previews, allowing users
 * to quickly find and access the content they're looking for.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import React from 'react';

/**
 * SearchResultsView component for displaying search results.
 * @param {Object} props - Component properties.
 * @param {Function} props.onFileSelect - Callback for file selection.
 * @param {Array} props.searchResults - Array of search results from content search.
 * @param {Array} props.fileSuggestions - Array of file name matches.
 * @param {string} props.searchQuery - The current search query.
 * @param {boolean} props.isLoading - Whether search is in progress.
 * @param {Function} props.onClearSearch - Callback to clear search results.
 * @return {JSX.Element} The SearchResultsView component.
 */
const SearchResultsView = ({ 
  onFileSelect, 
  searchResults = [], 
  fileSuggestions = [], 
  searchQuery = '', 
  isLoading = false,
  onClearSearch 
}) => {
  const handleFileClick = (filePath) => {
    if (onFileSelect) {
      onFileSelect(filePath);
    }
  };

  const handleClearSearch = () => {
    if (onClearSearch) {
      onClearSearch();
    }
  };

  const totalResults = fileSuggestions.length + searchResults.length;

  if (isLoading) {
    return (
      <div className="search-results-view p-4 confluence-bg">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted">Searching...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results-view p-4 confluence-bg">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 text-confluence-text mb-1">Search Results</h2>
          <p className="text-muted mb-0">
            {totalResults > 0 ? (
              <>Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"</>
            ) : (
              <>No results found for "{searchQuery}"</>
            )}
          </p>
        </div>
        
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={handleClearSearch}
        >
          <i className="bi bi-x-circle me-1"></i>
          Clear Search
        </button>
      </div>

      {totalResults === 0 ? (
        <div className="card shadow-sm border-0 home-section-card">
          <div className="card-body p-4 text-center py-5">
            <div className="mb-3">
              <i className="bi bi-search text-muted" style={{ fontSize: '3rem' }}></i>
            </div>
            <h3 className="h5 text-muted mb-2">No results found</h3>
            <p className="text-muted mb-0">
              Try adjusting your search terms or check for typos.
            </p>
          </div>
        </div>
      ) : (
        <div className="search-results-content">
          {/* File Name Matches */}
          {fileSuggestions.length > 0 && (
            <div className="card shadow-sm border-0 home-section-card mb-4">
              <div className="card-body p-4">
                <h5 className="text-confluence-text mb-3 border-bottom pb-2">
                  <i className="bi bi-file-earmark-text me-2"></i>
                  File Name Matches ({fileSuggestions.length})
                </h5>
                <div className="row">
                  {fileSuggestions.map((file, index) => (
                    <div key={`file-${index}`} className="col-lg-3 col-md-4 col-6 mb-3">
                      <div
                        className="home-dashboard-block p-3 h-100 cursor-pointer"
                        onClick={() => handleFileClick(file.path)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-start mb-2">
                          <i className="bi bi-file-earmark-text text-primary me-2 flex-shrink-0" style={{ fontSize: '1.2rem' }}></i>
                          <div className="flex-grow-1 min-width-0">
                            <h6 className="mb-1 text-confluence-text text-truncate fw-medium" title={file.name}>
                              {file.name.replace('.md', '')}
                            </h6>
                          </div>
                        </div>
                        <div className="small text-muted">
                          <div className="text-truncate">
                            <i className="bi bi-folder2 me-1"></i>
                            {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'Root'}
                          </div>
                          <div className="mt-1">
                            <span className="badge bg-primary badge-sm">File Match</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Content Matches */}
          {searchResults.length > 0 && (
            <div className="card shadow-sm border-0 home-section-card mb-4">
              <div className="card-body p-4">
                <h5 className="text-confluence-text mb-3 border-bottom pb-2">
                  <i className="bi bi-file-text me-2"></i>
                  Content Matches ({searchResults.length})
                </h5>
                <div className="row">
                  {searchResults.map((result, index) => (
                    <div key={`content-${index}`} className="col-lg-3 col-md-4 col-6 mb-3">
                      <div
                        className="home-dashboard-block p-3 h-100 cursor-pointer"
                        onClick={() => handleFileClick(result.filePath)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-start mb-2">
                          <i className="bi bi-file-text text-success me-2 flex-shrink-0" style={{ fontSize: '1.2rem' }}></i>
                          <div className="flex-grow-1 min-width-0">
                            <h6 className="mb-1 text-confluence-text text-truncate fw-medium" title={result.fileName}>
                              {result.fileName.replace('.md', '')}
                            </h6>
                          </div>
                        </div>
                        <div className="small text-muted">
                          <div className="mb-1 text-truncate">
                            <i className="bi bi-folder2 me-1"></i>
                            {result.filePath.includes('/') ? result.filePath.substring(0, result.filePath.lastIndexOf('/')) : 'Root'}
                          </div>
                          <div className="mb-1">
                            <span className="badge bg-success badge-sm">Content Match</span>
                          </div>
                          <div className="search-preview text-truncate" style={{ fontSize: '0.7rem', opacity: '0.8' }}>
                            <div dangerouslySetInnerHTML={{__html: result.preview}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(SearchResultsView);