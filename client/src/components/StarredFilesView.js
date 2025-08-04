/**
 * @fileoverview Starred files view component for Architecture Artifacts.
 * 
 * This component displays a list of files that have been starred/favorited by the user.
 * It shows information about when files were starred and allows users to quickly access
 * their favorite content.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import React, { useState, useEffect } from 'react';
import { getStarredFiles, toggleStarredFile } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

/**
 * StarredFilesView component for displaying starred/favorited files.
 * @param {Object} props - Component properties.
 * @param {Function} props.onFileSelect - Callback for file selection.
 * @param {boolean} props.isVisible - Whether the component is currently visible.
 * @return {JSX.Element} The StarredFilesView component.
 */
const StarredFilesView = ({ onFileSelect, isVisible }) => {
  const { isAuthenticated } = useAuth();
  const [starredFiles, setStarredFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isVisible && isAuthenticated) {
      loadStarredFiles();
    }
  }, [isVisible, isAuthenticated]);

  const loadStarredFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getStarredFiles();
      setStarredFiles(data.files || []);
    } catch (error) {
      console.error('Error loading starred files:', error);
      setError('Failed to load starred files');
      setStarredFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (filePath) => {
    if (onFileSelect) {
      onFileSelect(filePath);
    }
  };

  const handleUnstarFile = async (e, filePath) => {
    e.stopPropagation(); // Prevent file selection when clicking unstar
    
    try {
      await toggleStarredFile(filePath, false);
      toast.success('File unstarred successfully');
      // Remove the file from the local state immediately
      setStarredFiles(prev => prev.filter(file => file.path !== filePath));
    } catch (error) {
      console.error('Error unstarring file:', error);
      toast.error('Failed to unstar file');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="starred-files-view p-4 confluence-bg">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted">Loading starred files...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="starred-files-view p-4 confluence-bg">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 text-confluence-text mb-1">Starred Files</h2>
          <p className="text-muted mb-0">Your favorite files for quick access</p>
        </div>
        
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={loadStarredFiles}
          disabled={isLoading}
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <span>{error}</span>
          <button 
            className="btn btn-outline-danger btn-sm ms-auto"
            onClick={loadStarredFiles}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Retry
          </button>
        </div>
      )}

      {starredFiles.length === 0 && !error ? (
        <div className="card shadow-sm border-0 home-section-card">
          <div className="card-body p-4 text-center py-5">
            <div className="mb-3">
              <i className="bi bi-star text-muted" style={{ fontSize: '3rem' }}></i>
            </div>
            <h3 className="h5 text-muted mb-2">No starred files</h3>
            <p className="text-muted mb-0">
              Star your favorite files to see them here for quick access.
              <br />
              <small>Click the <i className="bi bi-star"></i> button in the editor to star a file.</small>
            </p>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0 home-section-card">
          <div className="card-body p-4">
            <div className="row">
              {starredFiles.map((file, index) => (
                <div key={file.path} className="col-lg-3 col-md-4 col-6 mb-3">
                  <div className="home-dashboard-block p-3 h-100 position-relative">
                    <div 
                      className="h-100 cursor-pointer"
                      onClick={() => handleFileClick(file.path)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex align-items-start mb-2">
                        <i className="bi bi-star-fill text-warning me-2 flex-shrink-0" style={{ fontSize: '1.2rem' }}></i>
                        <div className="flex-grow-1 min-width-0">
                          <h6 className="mb-1 text-confluence-text text-truncate fw-medium" title={file.name}>
                            {file.name.replace('.md', '')}
                          </h6>
                        </div>
                      </div>
                      <div className="small text-muted">
                        <div className="mb-1 text-truncate">
                          <i className="bi bi-folder2 me-1"></i>
                          {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'Root'}
                        </div>
                        <div className="mb-1 text-truncate">
                          <i className="bi bi-star me-1"></i>
                          Starred {formatDate(file.starredAt)}
                        </div>
                        {file.lastEditDate && (
                          <div className="text-truncate">
                            <i className="bi bi-pencil me-1"></i>
                            {file.lastEditBy}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-outline-warning btn-sm position-absolute"
                      onClick={(e) => handleUnstarFile(e, file.path)}
                      title="Remove from starred"
                      style={{ top: '0.5rem', right: '0.5rem', zIndex: 10 }}
                    >
                      <i className="bi bi-star-fill"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(StarredFilesView);