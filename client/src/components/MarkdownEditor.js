import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {tomorrow} from 'react-syntax-highlighter/dist/esm/styles/prism';

const MarkdownEditor = ({content, onChange, fileName, isLoading}) => {
  const [activeTab, setActiveTab] = useState('edit');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
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
          <h2>{fileName}</h2>
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
                  }
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
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;