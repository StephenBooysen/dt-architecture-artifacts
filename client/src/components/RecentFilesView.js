/**
 * @fileoverview Recent files view component for Architecture Artifacts.
 * 
 * This component displays a list of files that have been edited within the last 7 days.
 * It shows information about when files were last edited and by whom, allowing users
 * to quickly access recently modified content.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import React, { useState, useEffect } from 'react';
import { getRecentFiles } from '../services/api';

/**
 * RecentFilesView component for displaying recently edited files.
 * @param {Object} props - Component properties.
 * @param {Function} props.onFileSelect - Callback for file selection.
 * @param {boolean} props.isVisible - Whether the component is currently visible.
 * @return {JSX.Element} The RecentFilesView component.
 */
const RecentFilesView = ({ onFileSelect, isVisible }) => {
  const [recentFiles, setRecentFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDays, setSelectedDays] = useState(7);

  useEffect(() => {
    if (isVisible) {
      loadRecentFiles();
    }
  }, [isVisible, selectedDays]);

  const loadRecentFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getRecentFiles(selectedDays);
      setRecentFiles(data.files || []);
    } catch (error) {
      console.error('Error loading recent files:', error);
      setError('Failed to load recent files');
      setRecentFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (filePath) => {
    if (onFileSelect) {
      onFileSelect(filePath);
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
      <div className="recent-files-view p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted">Loading recent files...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-files-view p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 text-confluence-text mb-1">Recent Files</h2>
          <p className="text-muted mb-0">Files edited in the last {selectedDays} days</p>
        </div>
        
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="days-select" className="form-label small text-muted mb-0">
            Show files from:
          </label>
          <select
            id="days-select"
            className="form-select form-select-sm"
            value={selectedDays}
            onChange={(e) => setSelectedDays(parseInt(e.target.value))}
            style={{ width: 'auto' }}
          >
            <option value="1">Today</option>
            <option value="3">Last 3 days</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 2 weeks</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <span>{error}</span>
          <button 
            className="btn btn-outline-danger btn-sm ms-auto"
            onClick={loadRecentFiles}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Retry
          </button>
        </div>
      )}

      {recentFiles.length === 0 && !error ? (
        <div className="text-center py-5">
          <div className="mb-3">
            <i className="bi bi-clock-history text-muted" style={{ fontSize: '3rem' }}></i>
          </div>
          <h3 className="h5 text-muted mb-2">No recent files</h3>
          <p className="text-muted mb-0">
            No files have been edited in the last {selectedDays} {selectedDays === 1 ? 'day' : 'days'}.
          </p>
        </div>
      ) : (
        <div className="recent-files-list">
          {recentFiles.map((file, index) => (
            <div
              key={file.path}
              className="recent-file-item p-3 mb-2 border rounded cursor-pointer"
              onClick={() => handleFileClick(file.path)}
              style={{
                cursor: 'pointer',
                backgroundColor: 'var(--file-item-bg, #ffffff)',
                border: '1px solid var(--file-item-border, #dee2e6)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--file-item-hover-bg, #f8f9fa)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--file-item-bg, #ffffff)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-file-earmark-text text-primary me-2"></i>
                    <h6 className="mb-0 text-confluence-text fw-medium">{file.name}</h6>
                  </div>
                  
                  <div className="small text-muted mb-2">
                    <span className="me-3">
                      <i className="bi bi-folder2 me-1"></i>
                      {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'Root'}
                    </span>
                  </div>
                  
                  <div className="d-flex align-items-center gap-3 small">
                    <span className="text-muted">
                      <i className="bi bi-person-circle me-1"></i>
                      Last edited by <strong className="text-confluence-text">{file.lastEditBy}</strong>
                    </span>
                    <span className="text-muted">
                      <i className="bi bi-clock me-1"></i>
                      {formatDate(file.lastEditDate)} at {formatTime(file.lastEditDate)}
                    </span>
                  </div>
                  
                  {file.recentEdits && file.recentEdits.length > 1 && (
                    <div className="mt-2 small text-muted">
                      <i className="bi bi-pencil-square me-1"></i>
                      {file.recentEdits.length} edit{file.recentEdits.length !== 1 ? 's' : ''} in the last {selectedDays} days
                    </div>
                  )}
                </div>
                
                <div className="text-end">
                  <i className="bi bi-chevron-right text-muted"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {recentFiles.length > 0 && (
        <div className="mt-4 text-center">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={loadRecentFiles}
            disabled={isLoading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(RecentFilesView);