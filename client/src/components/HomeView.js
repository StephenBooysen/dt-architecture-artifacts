/**
 * @fileoverview Home page view component for Architecture Artifacts.
 * 
 * This component displays a dashboard-style home page with three main sections:
 * - Recent markdown files (last 6 edited files in 2 rows)
 * - Starred markdown files (last 6 starred files in 2 rows) 
 * - Templates (last 6 templates in 2 rows)
 * 
 * Each section shows files/templates in a grid layout with proper navigation
 * and actions when clicked.
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import React, { useState, useEffect } from 'react';
import { getRecentFiles, getStarredFiles, fetchTemplates } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * HomeView component for displaying the main dashboard.
 * @param {Object} props - Component properties.
 * @param {Function} props.onFileSelect - Callback for file selection.
 * @param {Function} props.onTemplateSelect - Callback for template selection.
 * @param {Function} props.onNewMarkdown - Callback to create new markdown file.
 * @param {boolean} props.isVisible - Whether the component is currently visible.
 * @return {JSX.Element} The HomeView component.
 */
const HomeView = ({ onFileSelect, onTemplateSelect, onNewMarkdown, isVisible, isReadonly = false, currentSpace }) => {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [recentFiles, setRecentFiles] = useState([]);
  const [starredFiles, setStarredFiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gitStatus, setGitStatus] = useState(null);
  const [gitLoading, setGitLoading] = useState(false);

  useEffect(() => {
    if (isVisible && isAuthenticated) {
      loadHomeData();
      if (currentSpace) {
        loadGitStatus();
      }
    }
  }, [isVisible, isAuthenticated, currentSpace]);

  const loadHomeData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [recentData, starredData, templatesData] = await Promise.all([
        getRecentFiles(7).catch(() => ({ files: [] })),
        getStarredFiles().catch(() => ({ files: [] })),
        fetchTemplates(currentSpace).catch(() => [])
      ]);
      
      // Filter for markdown files only and limit to 6
      const recentMarkdown = (recentData.files || [])
        .filter(file => file.name.endsWith('.md'))
        .slice(0, 6);
      
      const starredMarkdown = (starredData.files || [])
        .filter(file => file.name.endsWith('.md'))
        .slice(0, 6);
      
      // Ensure templatesData is an array
      const templatesArray = Array.isArray(templatesData) ? templatesData : [];
      const templatesLimited = templatesArray.slice(0, 6);
      
      setRecentFiles(recentMarkdown);
      setStarredFiles(starredMarkdown);
      setTemplates(templatesLimited);
    } catch (error) {
      console.error('Error loading home data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGitStatus = async () => {
    if (!currentSpace) return;
    
    try {
      setGitLoading(true);
      const response = await fetch('/api/spaces/git-status');
      if (response.ok) {
        const allSpaceStatus = await response.json();
        setGitStatus(allSpaceStatus[currentSpace] || null);
      }
    } catch (error) {
      console.error('Error loading git status:', error);
    } finally {
      setGitLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    // Simple toast notification for Git actions
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem;
      background: ${type === 'success' ? '#36b37e' : '#de350b'};
      color: white;
      border-radius: 4px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  const handleResyncSpace = async () => {
    try {
      const response = await fetch(`/api/spaces/${currentSpace}/resync`, {
        method: 'POST'
      });
      
      if (response.ok) {
        showToast(`Space "${currentSpace}" resynced successfully`, 'success');
        loadGitStatus(); // Refresh Git status
      } else {
        const error = await response.text();
        showToast(`Failed to resync: ${error}`, 'error');
      }
    } catch (err) {
      showToast('Error resyncing space', 'error');
    }
  };

  const handleCommitChanges = async () => {
    const commitMessage = prompt('Enter commit message:');
    if (!commitMessage) return;

    try {
      const response = await fetch(`/api/spaces/${currentSpace}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: commitMessage })
      });
      
      if (response.ok) {
        showToast(`Changes committed successfully`, 'success');
        loadGitStatus(); // Refresh Git status
      } else {
        const error = await response.text();
        showToast(`Failed to commit: ${error}`, 'error');
      }
    } catch (err) {
      showToast('Error committing changes', 'error');
    }
  };

  const handleForceReset = async () => {
    if (!window.confirm(`Are you sure you want to force reset "${currentSpace}"? This will discard all local changes.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/spaces/${currentSpace}/force-reset`, {
        method: 'POST'
      });
      
      if (response.ok) {
        showToast(`Space "${currentSpace}" reset successfully`, 'success');
        loadGitStatus(); // Refresh Git status
      } else {
        const error = await response.text();
        showToast(`Failed to reset: ${error}`, 'error');
      }
    } catch (err) {
      showToast('Error resetting space', 'error');
    }
  };

  const handleFileClick = (filePath) => {
    if (onFileSelect) {
      onFileSelect(filePath);
    }
  };

  const handleTemplateClick = (template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template, 'edit');
    }
  };


  const getTemplateIcon = (template) => {
    const name = template.name?.toLowerCase() || '';
    if (name.includes('meeting')) return { icon: 'bi-calendar-event', color: 'text-primary' };
    if (name.includes('adr') || name.includes('decision')) return { icon: 'bi-clipboard-check', color: 'text-success' };
    if (name.includes('architecture') || name.includes('software')) return { icon: 'bi-diagram-3', color: 'text-danger' };
    if (name.includes('project') || name.includes('plan')) return { icon: 'bi-kanban', color: 'text-warning' };
    if (name.includes('retrospective')) return { icon: 'bi-arrow-clockwise', color: 'text-info' };
    if (name.includes('roadmap')) return { icon: 'bi-signpost', color: 'text-secondary' };
    if (name.includes('sprint')) return { icon: 'bi-speedometer2', color: 'text-primary' };
    if (name.includes('feedback') || name.includes('daily')) return { icon: 'bi-chat-square-text', color: 'text-info' };
    if (name.includes('note')) return { icon: 'bi-journal-text', color: 'text-muted' };
    return { icon: 'bi-file-earmark-text', color: 'text-muted' };
  };

  const getTemplateCategory = (template) => {
    const name = template.name?.toLowerCase() || '';
    if (name.includes('meeting')) return 'Meetings';
    if (name.includes('adr') || name.includes('decision')) return 'Documentation';
    if (name.includes('architecture')) return 'Software';
    if (name.includes('project') || name.includes('plan')) return 'Strategy';
    if (name.includes('retrospective')) return 'Teamwork';
    return 'Popular';
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

  const FileCard = ({ file, onClick, icon = "bi-file-earmark-text", iconColor = "text-primary" }) => (
    <div className="col-lg-3 col-md-4 col-6 mb-3">
      <div
        className="home-dashboard-block p-3 h-100 cursor-pointer"
        onClick={() => onClick(file.path)}
        style={{ cursor: 'pointer' }}
      >
        <div className="d-flex align-items-start mb-2">
          <i className={`bi ${icon} ${iconColor} me-2 flex-shrink-0`} style={{ fontSize: '1.2rem' }}></i>
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
          {file.lastEditDate && (
            <div className="text-truncate">
              <i className="bi bi-clock me-1"></i>
              {formatDate(file.lastEditDate)}
            </div>
          )}
          {file.starredAt && (
            <div className="text-truncate">
              <i className="bi bi-star me-1"></i>
              Starred {formatDate(file.starredAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const TemplateCard = ({ template, onClick }) => (
    <div className="col-lg-3 col-md-4 col-6 mb-3">
      <div className="home-dashboard-block p-3 h-100 position-relative">
        <div 
          className="h-100 cursor-pointer"
          onClick={() => onClick(template)}
          style={{ cursor: 'pointer' }}
        >
          <div className="d-flex align-items-start mb-2">
            <i className={`bi ${getTemplateIcon(template).icon} ${getTemplateIcon(template).color} me-2 flex-shrink-0`} style={{ fontSize: '1.2rem' }}></i>
            <div className="flex-grow-1 min-width-0">
              <h6 className="mb-1 text-confluence-text text-truncate fw-medium" title={template.name}>
                {template.name.replace('.md', '')}
              </h6>
            </div>
          </div>
          <div className="small text-muted">
            <div className="mb-1">
              <span className="badge bg-secondary badge-sm">{getTemplateCategory(template)}</span>
            </div>
            {template.description && (
              <div className="mb-2 text-truncate" title={template.description} style={{ fontSize: '0.7rem', opacity: '0.8' }}>
                {template.description}
              </div>
            )}
          </div>
        </div>
        <div className="position-absolute" style={{ top: '0.5rem', right: '0.5rem', zIndex: 10 }}>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick(template);
            }}
            title="Edit Template"
          >
            <i className="bi bi-pencil"></i>
          </button>
        </div>
      </div>
    </div>
  );

  const EmptySection = ({ icon, message }) => (
    <div className="col-12">
      <div className="text-center py-4 text-muted">
        <i className={`bi ${icon} mb-2`} style={{ fontSize: '2rem' }}></i>
        <p className="mb-0">{message}</p>
      </div>
    </div>
  );

  const GitStatusSection = () => {
    if (!currentSpace || !gitStatus) return null;

    const isGitSpace = gitStatus.repo && gitStatus.branch;
    if (!isGitSpace) return null;

    const hasChanges = gitStatus.gitStatus && 
      (gitStatus.gitStatus.modified?.length > 0 || gitStatus.gitStatus.not_added?.length > 0);
    const hasIssues = !gitStatus.healthy;
    const needsSync = gitStatus.gitStatus && 
      (gitStatus.gitStatus.ahead > 0 || gitStatus.gitStatus.behind > 0);

    return (
      <div className="row mb-4">
        <div className="col-12">
          <div className={`card shadow-sm border-0 ${hasIssues ? 'border-danger' : hasChanges ? 'border-warning' : 'border-success'}`}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="d-flex align-items-center">
                  <i className={`bi ${hasIssues ? 'bi-exclamation-triangle-fill text-danger' : hasChanges ? 'bi-pencil-square text-warning' : 'bi-check-circle-fill text-success'} me-2`}></i>
                  <div>
                    <h6 className="mb-0 text-confluence-text">
                      Space Sync Status
                      <span className={`badge ms-2 ${hasIssues ? 'bg-danger' : hasChanges ? 'bg-warning' : 'bg-success'}`}>
                        {hasIssues ? 'Needs Attention' : hasChanges ? 'Changes Pending' : 'Up to Date'}
                      </span>
                    </h6>
                    <small className="text-muted">
                      {gitStatus.branch} • {gitStatus.repo}
                    </small>
                  </div>
                </div>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={loadGitStatus}
                  disabled={gitLoading}
                >
                  <i className={`bi ${gitLoading ? 'bi-arrow-clockwise spinner-border spinner-border-sm' : 'bi-arrow-clockwise'} me-1`}></i>
                  Refresh
                </button>
              </div>

              {gitStatus.gitStatus && (
                <div className="row mb-3">
                  <div className="col-3">
                    <div className="text-center">
                      <div className="badge bg-primary fs-6">{gitStatus.gitStatus.ahead || 0}</div>
                      <div className="small text-muted">Ahead</div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="text-center">
                      <div className="badge bg-info fs-6">{gitStatus.gitStatus.behind || 0}</div>
                      <div className="small text-muted">Behind</div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="text-center">
                      <div className="badge bg-warning fs-6">{gitStatus.gitStatus.modified?.length || 0}</div>
                      <div className="small text-muted">Modified</div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="text-center">
                      <div className="badge bg-secondary fs-6">{gitStatus.gitStatus.not_added?.length || 0}</div>
                      <div className="small text-muted">Untracked</div>
                    </div>
                  </div>
                </div>
              )}

              {hasIssues && gitStatus.error && (
                <div className="alert alert-danger py-2 mb-3">
                  <small>
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {gitStatus.error}
                    {gitStatus.error.includes('divergent branches') && (
                      <div className="mt-1">
                        <strong>Solution:</strong> Click "Sync Changes" to automatically resolve divergent branches using merge strategy.
                      </div>
                    )}
                  </small>
                </div>
              )}

              <div className="d-flex gap-2 flex-wrap">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleResyncSpace}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Sync Changes
                </button>
                
                {hasChanges && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={handleCommitChanges}
                  >
                    <i className="bi bi-check-circle me-1"></i>
                    Commit Changes
                  </button>
                )}
                
                {hasIssues && (
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={handleForceReset}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                    Force Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="home-view p-4 confluence-bg">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="home-view p-4 confluence-bg">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="text-center mb-4">
            <h1 className="display-5 text-confluence-text mb-2">Welcome to Architecture Artifacts</h1>
            <p className="lead text-muted">Your documentation workspace dashboard</p>
            {!isReadonly && onNewMarkdown && (
              <div className="mt-4">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={onNewMarkdown}
                >
                  <i className="bi bi-file-earmark-plus me-2"></i>
                  Create New Markdown File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <span>{error}</span>
          <button 
            className="btn btn-outline-danger btn-sm ms-auto"
            onClick={loadHomeData}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Retry
          </button>
        </div>
      )}

      {/* Git Status Section */}
      <GitStatusSection />

      {/* Recent Files Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0 home-section-card">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="h4 text-confluence-text mb-0">
                  <i className="bi bi-clock-history me-2"></i>
                  Recent Files
                </h3>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={loadHomeData}
                  disabled={isLoading}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </button>
              </div>
              <div className="row">
                {recentFiles.length > 0 ? (
                  recentFiles.map((file, index) => (
                    <FileCard 
                      key={`recent-${index}`} 
                      file={file} 
                      onClick={handleFileClick}
                    />
                  ))
                ) : (
                  <EmptySection 
                    icon="bi-clock-history" 
                    message="No recent markdown files found" 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Starred Files Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0 home-section-card">
            <div className="card-body p-4">
              <h3 className="h4 text-confluence-text mb-4">
                <i className="bi bi-star-fill me-2 text-warning"></i>
                Starred Files
              </h3>
              <div className="row">
                {starredFiles.length > 0 ? (
                  starredFiles.map((file, index) => (
                    <FileCard 
                      key={`starred-${index}`} 
                      file={file} 
                      onClick={handleFileClick}
                      icon="bi-star-fill"
                      iconColor="text-warning"
                    />
                  ))
                ) : (
                  <EmptySection 
                    icon="bi-star" 
                    message="No starred markdown files found" 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      {!isReadonly && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0 home-section-card">
              <div className="card-body p-4">
                <h3 className="h4 text-confluence-text mb-4">
                  <i className="bi bi-file-earmark-code me-2 text-success"></i>
                  Templates
                </h3>
                <div className="row">
                  {templates.length > 0 ? (
                    templates.map((template, index) => (
                      <TemplateCard 
                        key={`template-${index}`} 
                        template={template} 
                        onClick={handleTemplateClick}
                      />
                    ))
                  ) : (
                    <EmptySection 
                      icon="bi-file-earmark-code" 
                      message="No templates found" 
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(HomeView);