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
import { useTheme } from '../contexts/ThemeContext';

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
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [cleanContent, setCleanContent] = useState('');
  const [commentsForFile, setCommentsForFile] = useState([]);

  const fileType = fileName ? detectFileType(fileName) : FILE_TYPES.UNKNOWN;
  const isMarkdown = fileType === FILE_TYPES.MARKDOWN;

  // Separate clean content from comments when content changes
  useEffect(() => {
    if (content && isMarkdown) {
      const cleanMarkdown = getCleanMarkdownContent(content);
      const comments = extractComments(content);
      setCleanContent(cleanMarkdown);
      setCommentsForFile(comments);
    } else {
      setCleanContent(content || '');
      setCommentsForFile([]);
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
          <button
            className="btn btn-outline-secondary btn-sm editor-tab preview-window-btn"
            onClick={handleOpenPreviewWindow}
            disabled={!fileName}
            title="Open preview in new window">
            <i className="bi bi-box-arrow-up-right me-1"></i>Preview Window
          </button>
          
          <div className="vr mx-2"></div>
          
          <button
            className="btn btn-success btn-sm"
            onClick={onSave}
            disabled={!fileName || !hasChanges || isLoading}
            title="Save file">
            <i className="bi bi-floppy me-1"></i>Save
          </button>
        </div>
      </div>

      <div className="editor-content flex-grow-1 d-flex flex-column" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="editor-pane" style={{ height: '60%', minHeight: '300px' }}>
          <MDEditor
            value={cleanContent}
            onChange={handleContentChange}
            preview="edit"
            hideToolbar={false}
            data-color-mode={isDark ? 'dark' : 'light'}
            height="100%"
          />
        </div>
        
        {/* Comments section for markdown files */}
        {isMarkdown && (
          <div 
            className="comments-container mt-3 px-3 border-top" 
            style={{ 
              height: '40%', 
              minHeight: '200px',
              overflowY: 'auto',
              borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              paddingTop: '1rem'
            }}
          >
            <CommentsSection 
              fileName={fileName} 
              isVisible={true}
            />
          </div>
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