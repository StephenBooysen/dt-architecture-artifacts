import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {tomorrow} from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * MarkdownEditor component for editing and previewing markdown content.
 * @param {Object} props - Component properties.
 * @param {string} props.content - The markdown content to display/edit.
 * @param {Function} props.onChange - Callback for content changes.
 * @param {string} props.fileName - The current file name.
 * @param {boolean} props.isLoading - Loading state indicator.
 * @param {Function} props.onRename - Callback for renaming the current file.
 * @return {JSX.Element} The MarkdownEditor component.
 */
const MarkdownEditor = ({content, onChange, fileName, isLoading, onRename}) => {
  const [activeTab, setActiveTab] = useState('edit');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');

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
    if (!fileName || !content) return;
    
    // Encode the content and filename for the URL
    const encodedContent = encodeURIComponent(content);
    const encodedFileName = encodeURIComponent(fileName);
    
    // Open preview in new window
    const previewUrl = `/preview?file=${encodedFileName}&content=${encodedContent}`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  if (isLoading) {
    return (
      <div className="loading">
        <span>Loading editor...</span>
      </div>
    );
  }

  if (!fileName) {
    return (
      <div className="empty-state">
        <h3>No file selected</h3>
        <p>Select a markdown file from the sidebar to start editing.</p>
      </div>
    );
  }

  return (
    <div className="markdown-editor">
      <div className="editor-header">
        <div>
          <h2 
            className="editor-filename" 
            onClick={handleFileNameClick}
            title="Click to rename file"
          >
            {fileName}
          </h2>
        </div>
        <div className="editor-tabs">
          <button
            className={`editor-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => handleTabChange('edit')}>
            Edit
          </button>
          <button
            className={`editor-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => handleTabChange('preview')}>
            Preview
          </button>
          <button
            className={`editor-tab ${activeTab === 'split' ? 'active' : ''}`}
            onClick={() => handleTabChange('split')}>
            Split View
          </button>
          <button
            className="editor-tab preview-window-btn"
            onClick={handleOpenPreviewWindow}
            disabled={!fileName || !content}
            title="Open preview in new window">
            🔗 Preview Window
          </button>
        </div>
      </div>

      <div className="editor-content">
        {activeTab === 'edit' && (
          <div className="editor-pane">
            <textarea
              className="editor-textarea"
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Start writing your markdown here..."
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="preview-pane">
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
          <>
            <div className="editor-pane">
              <textarea
                className="editor-textarea"
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Start writing your markdown here..."
              />
            </div>
            <div className="preview-pane">
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
          </>
        )}
      </div>

      {showRenameDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Rename File</h2>
            <form onSubmit={handleRenameSubmit} className="modal-form">
              <div>
                <label htmlFor="rename-filename">New File Name:</label>
                <p style={{fontSize: '0.9rem', color: '#7f8c8d'}}>
                  Current: {fileName}
                </p>
                <input
                  id="rename-filename"
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Enter new filename"
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
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
      )}
    </div>
  );
};

export default MarkdownEditor;