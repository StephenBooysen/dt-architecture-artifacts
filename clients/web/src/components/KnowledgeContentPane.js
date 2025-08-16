/**
 * @fileoverview Knowledge view content display pane component
 * 
 * Provides the main content area for knowledge view mode including:
 * - Markdown content display with proper rendering
 * - Read-only interface with no editing capabilities
 * - File information and metadata display
 * - Clean, focused reading experience
 * - Welcome message when no content is selected
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * KnowledgeContentPane component for displaying content in knowledge view.
 * @param {Object} props - Component properties.
 * @param {string} props.content - Markdown content to display.
 * @param {Object} props.selectedFile - Currently selected file info.
 * @param {boolean} props.isLoading - Whether content is loading.
 * @return {JSX.Element} The KnowledgeContentPane component.
 */
const KnowledgeContentPane = ({
  content = '',
  selectedFile = null,
  isLoading = false
}) => {

  // Show loading state
  if (isLoading) {
    return (
      <div className="knowledge-content-pane">
        <div className="knowledge-content-loading">
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading content...</span>
            </div>
            <p className="text-muted mb-0">Loading content...</p>
          </div>
        </div>
        
        <style jsx>{`
          .knowledge-content-pane {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--confluence-bg);
            overflow-y: auto;
          }
          
          .knowledge-content-loading {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </div>
    );
  }

  // Show welcome message when no content is selected
  if (!selectedFile || !content) {
    return (
      <div className="knowledge-content-pane">
        <div className="knowledge-welcome">
          <div className="text-center py-5">
            <i className="bi bi-book text-primary mb-4" style={{fontSize: '3rem'}}></i>
            <h4 className="text-confluence-text mb-3">Welcome to Knowledge View</h4>
            <p className="text-muted mb-4">
              This is a read-only view of your content. Use the search functionality to discover and explore your knowledge base.
            </p>
            <div className="knowledge-features">
              <div className="feature-item">
                <i className="bi bi-search text-primary me-2"></i>
                <span>Search through files and content</span>
              </div>
              <div className="feature-item">
                <i className="bi bi-eye text-primary me-2"></i>
                <span>View content in a clean, focused interface</span>
              </div>
              <div className="feature-item">
                <i className="bi bi-shield-lock text-primary me-2"></i>
                <span>Read-only access ensures content integrity</span>
              </div>
            </div>
          </div>
        </div>
        
        <style jsx>{`
          .knowledge-content-pane {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--confluence-bg);
            overflow-y: auto;
          }
          
          .knowledge-welcome {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          
          .knowledge-features {
            max-width: 400px;
            margin: 0 auto;
          }
          
          .feature-item {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: var(--confluence-bg-card);
            border-radius: 8px;
            border: 1px solid var(--confluence-border);
          }
          
          .feature-item:last-child {
            margin-bottom: 0;
          }
        `}</style>
      </div>
    );
  }

  // Show content with file header
  return (
    <div className="knowledge-content-pane">
      {/* File Header */}
      <div className="knowledge-content-header">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <i className="bi bi-file-earmark-text text-primary me-2"></i>
            <div>
              <h6 className="mb-0 text-confluence-text">{selectedFile.title}</h6>
              <small className="text-muted">{selectedFile.path}</small>
            </div>
          </div>
          <div className="d-flex align-items-center">
            <span className="badge bg-light text-dark me-2">Read Only</span>
            {selectedFile.type && (
              <span className="badge bg-primary">
                {selectedFile.type === 'content' ? 'Content Match' : 'File Match'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Display */}
      <div className="knowledge-content-body">
        <div className="markdown-content">
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
              // Custom styling for various markdown elements
              h1: ({children}) => <h1 className="knowledge-h1">{children}</h1>,
              h2: ({children}) => <h2 className="knowledge-h2">{children}</h2>,
              h3: ({children}) => <h3 className="knowledge-h3">{children}</h3>,
              h4: ({children}) => <h4 className="knowledge-h4">{children}</h4>,
              h5: ({children}) => <h5 className="knowledge-h5">{children}</h5>,
              h6: ({children}) => <h6 className="knowledge-h6">{children}</h6>,
              p: ({children}) => <p className="knowledge-p">{children}</p>,
              ul: ({children}) => <ul className="knowledge-ul">{children}</ul>,
              ol: ({children}) => <ol className="knowledge-ol">{children}</ol>,
              li: ({children}) => <li className="knowledge-li">{children}</li>,
              blockquote: ({children}) => <blockquote className="knowledge-blockquote">{children}</blockquote>,
              table: ({children}) => <table className="knowledge-table table table-bordered">{children}</table>,
              a: ({href, children}) => <a href={href} className="knowledge-link" target="_blank" rel="noopener noreferrer">{children}</a>
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
      
      <style jsx>{`
        .knowledge-content-pane {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--confluence-bg);
        }
        
        .knowledge-content-header {
          padding: 1.5rem;
          background: var(--confluence-bg-card);
          border-bottom: 2px solid var(--confluence-border);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .knowledge-content-body {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
        }
        
        .markdown-content {
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.6;
        }
        
        /* Markdown styling */
        .markdown-content :global(.knowledge-h1) {
          color: var(--confluence-text);
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          margin-top: 2rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--confluence-border);
        }
        
        .markdown-content :global(.knowledge-h1:first-child) {
          margin-top: 0;
        }
        
        .markdown-content :global(.knowledge-h2) {
          color: var(--confluence-text);
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          margin-top: 1.5rem;
        }
        
        .markdown-content :global(.knowledge-h3) {
          color: var(--confluence-text);
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          margin-top: 1.25rem;
        }
        
        .markdown-content :global(.knowledge-h4),
        .markdown-content :global(.knowledge-h5),
        .markdown-content :global(.knowledge-h6) {
          color: var(--confluence-text);
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 1rem;
        }
        
        .markdown-content :global(.knowledge-p) {
          color: var(--confluence-text);
          margin-bottom: 1rem;
          font-size: 0.95rem;
        }
        
        .markdown-content :global(.knowledge-ul),
        .markdown-content :global(.knowledge-ol) {
          color: var(--confluence-text);
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        
        .markdown-content :global(.knowledge-li) {
          margin-bottom: 0.25rem;
        }
        
        .markdown-content :global(.knowledge-blockquote) {
          border-left: 4px solid var(--confluence-primary);
          background: var(--confluence-border-subtle);
          padding: 1rem 1.5rem;
          margin: 1.5rem 0;
          color: var(--confluence-text-subtle);
          font-style: italic;
        }
        
        .markdown-content :global(.knowledge-table) {
          margin: 1.5rem 0;
          background: var(--confluence-bg-card);
        }
        
        .markdown-content :global(.knowledge-link) {
          color: var(--confluence-primary);
          text-decoration: none;
        }
        
        .markdown-content :global(.knowledge-link:hover) {
          color: var(--confluence-primary-hover);
          text-decoration: underline;
        }
        
        .markdown-content :global(code) {
          background: var(--confluence-border-subtle);
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-size: 0.9em;
          color: var(--confluence-text);
        }
        
        .markdown-content :global(pre) {
          background: #2d3748;
          padding: 1rem;
          border-radius: 8px;
          margin: 1.5rem 0;
          overflow-x: auto;
        }
        
        .markdown-content :global(pre code) {
          background: transparent;
          padding: 0;
          color: inherit;
        }
        
        .markdown-content :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1rem 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .markdown-content :global(hr) {
          border: none;
          border-top: 1px solid var(--confluence-border);
          margin: 2rem 0;
        }
      `}</style>
    </div>
  );
};

export default KnowledgeContentPane;