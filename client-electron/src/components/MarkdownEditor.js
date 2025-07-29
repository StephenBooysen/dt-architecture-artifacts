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
import {tomorrow} from 'react-syntax-highlighter/dist/esm/styles/prism';
import PDFViewer from './PDFViewer';
import ImageViewer from './ImageViewer';
import TextViewer from './TextViewer';
import FileDownloader from './FileDownloader';
import { detectFileType, FILE_TYPES } from '../utils/fileTypeDetector';

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
const MarkdownEditor = ({content, onChange, fileName, isLoading, onRename, defaultMode = 'edit', fileData, onSave, hasChanges}) => {
  const [activeTab, setActiveTab] = useState(defaultMode);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const fileType = fileName ? detectFileType(fileName) : FILE_TYPES.UNKNOWN;
  const isMarkdown = fileType === FILE_TYPES.MARKDOWN;
  
  useEffect(() => {
    if (fileName) {
      // Only set activeTab for markdown files, other files will use their specific viewers
      if (isMarkdown) {
        setActiveTab(defaultMode);
      }
    }
  }, [fileName, defaultMode, isMarkdown]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
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
            className={`btn btn-sm ${activeTab === 'edit' ? 'btn-primary' : 'btn-outline-secondary'} editor-tab`}
            onClick={() => handleTabChange('edit')}>
            Edit
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'preview' ? 'btn-primary' : 'btn-outline-secondary'} editor-tab`}
            onClick={() => handleTabChange('preview')}>
            Preview
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'split' ? 'btn-primary' : 'btn-outline-secondary'} editor-tab`}
            onClick={() => handleTabChange('split')}>
            Split View
          </button>
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

      <div className="editor-content flex-grow-1 d-flex flex-column">
        {activeTab === 'edit' && (
          <div className="editor-pane flex-grow-1">
            <textarea
              className="form-control editor-textarea h-100"
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Start writing your markdown here..."
              style={{fontFamily: 'monospace', resize: 'none', overflowY: 'auto'}}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="preview-pane bg-light border rounded p-3 flex-grow-1" style={{overflow: 'auto', maxHeight: '100%'}}>
            <div className="preview-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={tomorrow}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {activeTab === 'split' && (
          <div className="d-flex gap-3 flex-grow-1">
            <div className="editor-pane" style={{width: '50%'}}>
              <textarea
                className="form-control editor-textarea h-100"
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Start writing your markdown here..."
                style={{fontFamily: 'monospace', resize: 'none', overflowY: 'auto'}}
              />
            </div>
            <div className="preview-pane bg-light border rounded p-3 h-100" style={{width: '50%', overflow: 'auto', maxHeight: '100%'}}>
              <div className="preview-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
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