/**
 * @fileoverview Markdown editor and file viewer component.
 * 
 * This is the main editor component that handles viewing and editing of various
 * file types including Markdown, PDF, images, and text files. It provides a
 * tabbed interface with edit, preview, and split view modes for Markdown files,
 * and appropriate viewers for other file types.
 * 
 * Key features:
 * - Multi-format file support (Markdown, PDF, images, text)
 * - Tabbed interface (edit/preview/split for Markdown)
 * - Syntax highlighting for code blocks
 * - File renaming functionality
 * - External preview window support
 * - GitHub Flavored Markdown support
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {tomorrow, darcula} from 'react-syntax-highlighter/dist/esm/styles/prism';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import PDFViewer from './PDFViewer';
import ImageViewer from './ImageViewer';
import TextViewer from './TextViewer';
import FileDownloader from './FileDownloader';
import CommentsSection from './CommentsSection';
import { detectFileType, FILE_TYPES } from '../utils/fileTypeDetector';
import { getCleanMarkdownContent, injectComments, extractComments } from '../utils/commentParser';
import { extractMetadata, getCleanMarkdownContentWithoutMetadata, injectMetadata } from '../utils/metadataParser';
import { getFileMetadata, toggleStarredFile } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

/**
 * MarkdownEditor component for editing and previewing different file types.
 * @param {Object} props - Component properties.
 * @param {string} props.content - The file content to display/edit.
 * @param {Function} props.onChange - Callback for content changes.
 * @param {string} props.fileName - The current file name.
 * @param {boolean} props.isLoading - Loading state indicator.
 * @param {Function} props.onRename - Callback for renaming the current file.
 * @param {string} props.defaultMode - Default editor mode (edit, preview, split).
 * @param {Object} props.fileData - Complete file data including type and encoding.
 * @param {Function} props.onSave - Callback for saving the file.
 * @param {boolean} props.hasChanges - Whether the file has unsaved changes.
 * @return {JSX.Element} The MarkdownEditor component.
 */
const MarkdownEditor = ({content, onChange, fileName, isLoading, onRename, fileData, onSave, hasChanges}) => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [cleanContent, setCleanContent] = useState('');
  const [commentsForFile, setCommentsForFile] = useState([]);
  const [isStarred, setIsStarred] = useState(false);
  const [isStarring, setIsStarring] = useState(false);
  const [viewMode, setViewMode] = useState('preview'); // default to preview mode
  const [commentsHeight, setCommentsHeight] = useState(() => {
    const saved = localStorage.getItem('architecture-artifacts-comments-height');
    return saved ? parseInt(saved, 10) : 200;
  });
  const [isResizingComments, setIsResizingComments] = useState(false);
  const [containerRect, setContainerRect] = useState(null);

  const fileType = fileName ? detectFileType(fileName) : FILE_TYPES.UNKNOWN;
  const isMarkdown = fileType === FILE_TYPES.MARKDOWN;

  // Handle comments section resizing
  const handleCommentsMouseDown = (e) => {
    const container = e.currentTarget.closest('.editor-content');
    if (container) {
      setContainerRect(container.getBoundingClientRect());
      setIsResizingComments(true);
      e.preventDefault();
    }
  };

  const handleCommentsMouseMove = React.useCallback((e) => {
    if (!isResizingComments || !containerRect) return;
    
    const newHeight = containerRect.bottom - e.clientY;
    const minHeight = 150;
    const maxHeight = containerRect.height - 200; // Leave at least 200px for editor
    
    if (newHeight >= minHeight && newHeight <= maxHeight) {
      setCommentsHeight(newHeight);
      localStorage.setItem('architecture-artifacts-comments-height', newHeight.toString());
    }
  }, [isResizingComments, containerRect]);

  const handleCommentsMouseUp = React.useCallback(() => {
    setIsResizingComments(false);
    setContainerRect(null);
  }, []);

  React.useEffect(() => {
    if (isResizingComments) {
      document.addEventListener('mousemove', handleCommentsMouseMove);
      document.addEventListener('mouseup', handleCommentsMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleCommentsMouseMove);
      document.removeEventListener('mouseup', handleCommentsMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleCommentsMouseMove);
      document.removeEventListener('mouseup', handleCommentsMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingComments, handleCommentsMouseMove, handleCommentsMouseUp]);

  // Separate clean content from comments when content changes
  useEffect(() => {
    if (content && isMarkdown) {
      const cleanMarkdown = getCleanMarkdownContent(content);
      const comments = extractComments(content);
      const metadata = extractMetadata(content);
      setCleanContent(cleanMarkdown);
      setCommentsForFile(comments);
      setIsStarred(metadata.starred || false);
    } else {
      setCleanContent(content || '');
      setCommentsForFile([]);
      setIsStarred(false);
    }
  }, [content, isMarkdown]);

  // Handle content changes in the editor
  const handleContentChange = (newCleanContent) => {
    setCleanContent(newCleanContent || '');
    
    // Combine clean content with existing comments for the full content
    if (isMarkdown && commentsForFile.length > 0) {
      const fullContent = injectComments(newCleanContent || '', commentsForFile);
      onChange(fullContent);
    } else {
      onChange(newCleanContent || '');
    }
  };

  const handleFileNameClick = () => {
    if (fileName && onRename) {
      const currentName = fileName.split('/').pop(); // Get just the filename
      setRenameValue(currentName);
      setShowRenameDialog(true);
    }
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (!renameValue.trim()) return;

    // Validate input - no special characters except hyphens and underscores
    const cleanInput = renameValue.trim();
    const invalidChars = /[<>:"/\\|?*]/;
    
    if (invalidChars.test(cleanInput)) {
      alert('Invalid characters detected. Please use only letters, numbers, hyphens, and underscores.');
      return;
    }

    if (onRename) {
      onRename(fileName, cleanInput);
    }

    setShowRenameDialog(false);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setShowRenameDialog(false);
    setRenameValue('');
  };

  const handleOpenPreviewWindow = () => {
    if (!fileName) return;
    
    // Only pass the file path as reference
    const encodedFileName = encodeURIComponent(fileName);
    
    // Open preview in new window
    const previewUrl = `/preview?file=${encodedFileName}`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const handleToggleStar = async () => {
    if (!fileName || !isMarkdown || isStarring) return;
    
    try {
      setIsStarring(true);
      const newStarredStatus = !isStarred;
      
      // Call API to toggle starred status
      await toggleStarredFile(fileName, newStarredStatus);
      
      // Update local state
      setIsStarred(newStarredStatus);
      
      // Show success message
      toast.success(newStarredStatus ? 'File starred!' : 'File unstarred!');
    } catch (error) {
      console.error('Error toggling star:', error);
      toast.error('Failed to update starred status');
    } finally {
      setIsStarring(false);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5 loading">
        <div className="spinner-border text-primary me-2" role="status"></div>
        <span className="text-muted">Loading editor...</span>
      </div>
    );
  }

  if (!fileName) {
    return (
      <div className="text-center p-5 empty-state">
        <h3 className="h4 text-muted mb-3">No file selected</h3>
        <p className="text-muted mb-0">Select a file from the sidebar to start viewing.</p>
      </div>
    );
  }

  // Render different viewers based on file type
  if (fileType === FILE_TYPES.PDF) {
    return (
      <PDFViewer 
        content={content} 
        fileName={fileName} 
      />
    );
  }

  if (fileType === FILE_TYPES.IMAGE) {
    return (
      <ImageViewer 
        content={content} 
        fileName={fileName} 
      />
    );
  }

  if (fileType === FILE_TYPES.TEXT) {
    return (
      <TextViewer 
        content={content} 
        fileName={fileName} 
      />
    );
  }

  if (fileType === FILE_TYPES.UNKNOWN) {
    return (
      <FileDownloader 
        filePath={fileName}
        fileName={fileName.split('/').pop()}
        fileSize={fileData?.size || 0}
      />
    );
  }

  // Default markdown editor for markdown files
  return (
    <div className="markdown-editor d-flex flex-column h-100">
      <div className="d-flex justify-content-between align-items-center py-3 px-3 mb-3 editor-header flex-shrink-0">
        <div className="d-flex align-items-center">
          <h2 
            className="h5 mb-0 text-confluence-text editor-filename" 
            onClick={handleFileNameClick}
            title="Click to rename file"
            style={{cursor: 'pointer', lineHeight: '1.5'}}
          >
            {fileName}
          </h2>
        </div>
        <div className="d-flex gap-2 editor-tabs">
          {/* Star button for markdown files */}
          {isMarkdown && (
            <>
              <button
                className={`btn btn-sm ${isStarred ? 'btn-warning' : 'btn-outline-warning'} star-btn`}
                onClick={handleToggleStar}
                disabled={!fileName || isStarring}
                title={isStarred ? 'Remove from starred' : 'Add to starred'}
              >
                {isStarring ? (
                  <div className="spinner-border spinner-border-sm me-1" role="status"></div>
                ) : (
                  <i className={`bi ${isStarred ? 'bi-star-fill' : 'bi-star'} me-1`}></i>
                )}
                {isStarred ? 'Starred' : 'Star'}
              </button>
              
              <div className="vr mx-2"></div>
            </>
          )}
          
          <button
            className="btn btn-outline-secondary btn-sm editor-tab preview-window-btn"
            onClick={handleOpenPreviewWindow}
            disabled={!fileName}
            title="Open preview in new window">
            <i className="bi bi-box-arrow-up-right me-1"></i>Preview Window
          </button>
          
          {/* View mode buttons for markdown files */}
          {isMarkdown && (
            <>
              <button
                className={`btn btn-sm ${viewMode === 'preview' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('preview')}
                title="Preview mode">
                <i className="bi bi-eye me-1"></i>Preview
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'edit' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('edit')}
                title="Edit mode">
                <i className="bi bi-pencil me-1"></i>Edit
              </button>
              
              <div className="vr mx-2"></div>
            </>
          )}
          
          <button
            className="btn btn-success btn-sm"
            onClick={onSave}
            disabled={!fileName || !hasChanges || isLoading}
            title="Save file">
            <i className="bi bi-floppy me-1"></i>Save
          </button>
        </div>
      </div>

      <div className="editor-content flex-grow-1 d-flex flex-column" style={{ height: 'calc(100vh - 120px)', position: 'relative' }}>
        <div 
          className="editor-pane" 
          style={{ 
            height: isMarkdown ? `calc(100% - ${commentsHeight + 8}px)` : '100%', 
            minHeight: '200px' 
          }}
        >
          <MDEditor
            value={cleanContent}
            onChange={handleContentChange}
            preview={viewMode}
            hideToolbar={false}
            data-color-mode={isDark ? 'dark' : 'light'}
            height="100%"
          />
        </div>
        
        {/* Comments section for markdown files */}
        {isMarkdown && (
          <>
            {/* Resizer bar */}
            <div 
              className="comments-resizer"
              style={{
                height: '8px',
                background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                cursor: 'row-resize',
                borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseDown={handleCommentsMouseDown}
              title="Drag to resize comments section"
            >
              <div 
                style={{
                  fontSize: '10px',
                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                  letterSpacing: '2px'
                }}
              >
                ⋮⋮⋮
              </div>
            </div>
            
            <div 
              className="comments-container px-3" 
              style={{ 
                height: `${commentsHeight}px`,
                minHeight: '150px',
                overflowY: 'auto',
                paddingTop: '0.5rem'
              }}
            >
              <CommentsSection 
                fileName={fileName} 
                isVisible={true}
              />
            </div>
          </>
        )}
      </div>

      {showRenameDialog && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(9, 30, 66, 0.54)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Rename File</h5>
                <button type="button" className="btn-close" onClick={handleRenameCancel}></button>
              </div>
              <form onSubmit={handleRenameSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="rename-filename" className="form-label">New File Name:</label>
                    <p className="small text-muted mb-2">
                      Current: {fileName}
                    </p>
                    <input
                      id="rename-filename"
                      type="text"
                      className="form-control"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      placeholder="Enter new filename"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRenameCancel}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!renameValue.trim()}>
                    Rename
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MarkdownEditor);