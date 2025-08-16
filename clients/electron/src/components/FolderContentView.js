/**
 * @fileoverview Folder content view component for displaying files in a folder.
 * 
 * This component displays the contents of a specific folder in a view similar to
 * the recent files view. It shows markdown files and subfolders in a grid layout,
 * allowing users to navigate into subfolders or open files directly.
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState, useEffect } from 'react';
import { getFolderName } from '../utils/urlUtils';

/**
 * FolderContentView component for displaying folder contents.
 * @param {Object} props - Component properties
 * @param {Array} props.files - The complete file tree
 * @param {string} props.folderPath - The current folder path to display
 * @param {string} props.currentSpace - The current space
 * @param {Function} props.onFileSelect - Callback when a file is selected
 * @param {Function} props.onFolderSelect - Callback when a folder is selected
 * @param {Function} props.onNavigateToSpace - Callback to navigate to space home
 * @param {boolean} props.isLoading - Loading state
 * @returns {JSX.Element} The FolderContentView component
 */
const FolderContentView = ({
  files,
  folderPath,
  currentSpace,
  onFileSelect,
  onFolderSelect,
  onNavigateToSpace,
  isLoading = false
}) => {
  const [folderContents, setFolderContents] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);

  /**
   * Finds a folder in the file tree by path.
   * @param {Array} tree - The file tree to search
   * @param {string} targetPath - The path to find
   * @returns {Object|null} The found folder object or null
   */
  const findFolderByPath = (tree, targetPath) => {
    if (!targetPath) {
      // Root level - return a virtual folder with the tree as children
      return {
        name: currentSpace,
        path: '',
        type: 'directory',
        children: tree
      };
    }

    const pathSegments = targetPath.split('/');
    
    const findInLevel = (items, segments) => {
      if (segments.length === 0) return null;
      
      const currentSegment = segments[0];
      const remainingSegments = segments.slice(1);
      
      for (const item of items) {
        if (item.name === currentSegment && item.type === 'directory') {
          if (remainingSegments.length === 0) {
            return item;
          } else if (item.children) {
            return findInLevel(item.children, remainingSegments);
          }
        }
      }
      return null;
    };
    
    return findInLevel(tree, pathSegments);
  };

  /**
   * Updates the folder contents when the folder path changes.
   */
  useEffect(() => {
    if (!files || files.length === 0) {
      setFolderContents([]);
      setCurrentFolder(null);
      return;
    }

    const folder = findFolderByPath(files, folderPath);
    setCurrentFolder(folder);
    
    if (folder && folder.children) {
      // Sort contents: directories first, then files
      const sortedContents = [...folder.children].sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });
      setFolderContents(sortedContents);
    } else {
      setFolderContents([]);
    }
  }, [files, folderPath, currentSpace]);

  /**
   * Handles clicking on a file - calls onFileSelect callback.
   * @param {Object} file - The file object
   */
  const handleFileClick = (file) => {
    if (onFileSelect) {
      onFileSelect(file.path);
    }
  };

  /**
   * Handles clicking on a folder - calls onFolderSelect callback.
   * @param {Object} folder - The folder object
   */
  const handleFolderClick = (folder) => {
    if (onFolderSelect) {
      onFolderSelect(folder.path);
    }
  };

  /**
   * Generates breadcrumb navigation for the current folder.
   * @returns {Array} Array of breadcrumb objects
   */
  const getBreadcrumbs = () => {
    if (!folderPath) {
      return [{ name: currentSpace, path: '', isLast: true }];
    }

    const segments = folderPath.split('/');
    const breadcrumbs = [
      { name: currentSpace, path: '', isLast: false }
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      breadcrumbs.push({
        name: segment,
        path: currentPath,
        isLast: index === segments.length - 1
      });
    });

    return breadcrumbs;
  };

  /**
   * Handles breadcrumb navigation.
   * @param {string} breadcrumbPath - The path to navigate to
   */
  const handleBreadcrumbClick = (breadcrumbPath) => {
    if (breadcrumbPath === '') {
      // Navigate to space home
      if (onNavigateToSpace) {
        onNavigateToSpace();
      }
    } else {
      // Navigate to folder
      if (onFolderSelect) {
        onFolderSelect(breadcrumbPath);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="folder-content-view">
        <div className="d-flex justify-content-center align-items-center p-5">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading folder contents...</p>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbs = getBreadcrumbs();
  const folderName = getFolderName(folderPath) || currentSpace;

  return (
    <div className="folder-content-view">
      <div className="folder-header mb-4">
        {/* Breadcrumb Navigation */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            {breadcrumbs.map((breadcrumb, index) => (
              <li
                key={index}
                className={`breadcrumb-item ${breadcrumb.isLast ? 'active' : ''}`}
                aria-current={breadcrumb.isLast ? 'page' : undefined}
              >
                {breadcrumb.isLast ? (
                  <span className="text-confluence-text fw-medium">{breadcrumb.name}</span>
                ) : (
                  <button
                    className="btn btn-link p-0 text-decoration-none text-confluence-text"
                    onClick={() => handleBreadcrumbClick(breadcrumb.path)}
                  >
                    {breadcrumb.name}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Folder Title */}
        <div className="d-flex align-items-center mb-3">
          <i className="bi bi-folder2-open text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
          <h1 className="h3 mb-0 text-confluence-text fw-semibold">{folderName}</h1>
        </div>

        {/* Folder Stats */}
        <div className="folder-stats">
          <span className="badge bg-secondary me-2">
            {folderContents.filter(item => item.type === 'file').length} files
          </span>
          <span className="badge bg-secondary">
            {folderContents.filter(item => item.type === 'directory').length} folders
          </span>
        </div>
      </div>

      {/* Folder Contents */}
      <div className="folder-contents">
        {folderContents.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-folder2 text-muted mb-3" style={{ fontSize: '3rem' }}></i>
            <h4 className="text-muted">Empty Folder</h4>
            <p className="text-muted">This folder doesn't contain any files or subfolders.</p>
          </div>
        ) : (
          <div className="row g-3">
            {folderContents.map((item) => (
              <div key={item.path} className="col-md-6 col-lg-4">
                <div
                  className="card h-100 cursor-pointer folder-item-card"
                  onClick={() => item.type === 'file' ? handleFileClick(item) : handleFolderClick(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body">
                    <div className="d-flex align-items-start">
                      <div className="me-3">
                        <i
                          className={`bi ${
                            item.type === 'directory'
                              ? 'bi-folder2 text-warning'
                              : 'bi-file-earmark-text text-primary'
                          }`}
                          style={{ fontSize: '2rem' }}
                        ></i>
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="card-title mb-2 text-confluence-text">
                          {item.name}
                        </h5>
                        <p className="card-text">
                          <small className="text-muted">
                            {item.type === 'directory' 
                              ? `Folder • ${item.children ? item.children.length : 0} items`
                              : `File • ${item.fileType || 'Unknown type'}`
                            }
                          </small>
                        </p>
                      </div>
                      <div className="ms-auto">
                        <i className="bi bi-chevron-right text-muted"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderContentView;