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
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import React, { useState, useEffect } from 'react';
import { getRecentFiles, getStarredFiles, fetchTemplates } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

/**
 * HomeView component for displaying the main dashboard.
 * @param {Object} props - Component properties.
 * @param {Function} props.onFileSelect - Callback for file selection.
 * @param {Function} props.onTemplateSelect - Callback for template selection.
 * @param {boolean} props.isVisible - Whether the component is currently visible.
 * @return {JSX.Element} The HomeView component.
 */
const HomeView = ({ onFileSelect, onTemplateSelect, isVisible }) => {
  const { isDark } = useTheme();
  const [recentFiles, setRecentFiles] = useState([]);
  const [starredFiles, setStarredFiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isVisible) {
      loadHomeData();
    }
  }, [isVisible]);

  const loadHomeData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [recentData, starredData, templatesData] = await Promise.all([
        getRecentFiles(7).catch(() => ({ files: [] })),
        getStarredFiles().catch(() => ({ files: [] })),
        fetchTemplates().catch(() => [])
      ]);
      
      // Filter for markdown files only and limit to 6
      const recentMarkdown = (recentData.files || [])
        .filter(file => file.name.endsWith('.md'))
        .slice(0, 6);
      
      const starredMarkdown = (starredData.files || [])
        .filter(file => file.name.endsWith('.md'))
        .slice(0, 6);
      
      const templatesLimited = (templatesData || []).slice(0, 6);
      
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

  const handleFileClick = (filePath) => {
    if (onFileSelect) {
      onFileSelect(filePath);
    }
  };

  const handleTemplateClick = (template) => {
    if (onTemplateSelect) {
      onTemplateSelect(template, 'use');
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

  const FileCard = ({ file, onClick, icon = "bi-file-earmark-text", iconColor = "text-primary" }) => (
    <div
      className="col-md-4 mb-3"
      onClick={() => onClick(file.path)}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="card h-100 border-0 shadow-sm"
        style={{
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} !important`,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '';
        }}
      >
        <div className="card-body p-3">
          <div className="d-flex align-items-start mb-2">
            <i className={`bi ${icon} ${iconColor} me-2 flex-shrink-0`} style={{ fontSize: '1.2rem' }}></i>
            <div className="flex-grow-1 min-width-0">
              <h6 className="card-title mb-1 text-confluence-text text-truncate" title={file.name}>
                {file.name.replace('.md', '')}
              </h6>
              <p className="card-text small text-muted mb-1">
                {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'Root'}
              </p>
              {file.lastEditDate && (
                <p className="card-text small text-muted mb-0">
                  {formatDate(file.lastEditDate)}
                </p>
              )}
              {file.starredAt && (
                <p className="card-text small text-muted mb-0">
                  Starred {formatDate(file.starredAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const TemplateCard = ({ template, onClick }) => (
    <div
      className="col-md-4 mb-3"
      onClick={() => onClick(template)}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="card h-100 border-0 shadow-sm"
        style={{
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} !important`,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '';
        }}
      >
        <div className="card-body p-3">
          <div className="d-flex align-items-start mb-2">
            <i className="bi bi-file-earmark-code text-success me-2 flex-shrink-0" style={{ fontSize: '1.2rem' }}></i>
            <div className="flex-grow-1 min-width-0">
              <h6 className="card-title mb-1 text-confluence-text text-truncate" title={template.name}>
                {template.name}
              </h6>
              {template.description && (
                <p className="card-text small text-muted mb-1 text-truncate" title={template.description}>
                  {template.description}
                </p>
              )}
              <p className="card-text small text-muted mb-0">
                Template
              </p>
            </div>
          </div>
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

  if (isLoading) {
    return (
      <div className="home-view p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="home-view p-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="text-center mb-4">
            <h1 className="display-5 text-confluence-text mb-2">Welcome to Architecture Artifacts</h1>
            <p className="lead text-muted">Your documentation workspace dashboard</p>
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

      {/* Recent Files Section */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
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

      {/* Starred Files Section */}
      <div className="row mb-5">
        <div className="col-12">
          <h3 className="h4 text-confluence-text mb-3">
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

      {/* Templates Section */}
      <div className="row mb-5">
        <div className="col-12">
          <h3 className="h4 text-confluence-text mb-3">
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
  );
};

export default React.memo(HomeView);