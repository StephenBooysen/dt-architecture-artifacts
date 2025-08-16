/**
 * @fileoverview Standalone preview window component for Architecture Artifacts.
 * 
 * This component renders markdown content in a dedicated preview window that
 * can be opened separately from the main application. It provides a clean,
 * distraction-free environment for viewing rendered markdown content with
 * syntax highlighting and GitHub Flavored Markdown support.
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { fetchFile } from '../services/api';

/**
 * PreviewWindow component for displaying markdown content in a standalone window.
 * @return {JSX.Element} The PreviewWindow component.
 */
const PreviewWindow = () => {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFile = async () => {
      // Get filename from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const fileParam = urlParams.get('file');

      if (fileParam) {
        const decodedFileName = decodeURIComponent(fileParam);
        setFileName(decodedFileName);
        
        // Set page title
        document.title = `Preview: ${decodedFileName}`;
        
        // Fetch file content from API
        try {
          setIsLoading(true);
          setError('');
          const fileData = await fetchFile(decodedFileName);
          setContent(fileData.content || '');
        } catch (err) {
          console.error('Error fetching file:', err);
          setError('Failed to load file content');
          setContent('');
        } finally {
          setIsLoading(false);
        }
      } else {
        document.title = 'Markdown Preview';
        setError('No file specified');
      }
    };

    loadFile();
  }, []);

  return (
    <div className="preview-window" style={{
      height: '100vh', 
      width: '100vw',
      display: 'flex', 
      flexDirection: 'column',
      padding: '0 20px 20px 0',
      boxSizing: 'border-box'
    }}>
      <div className="preview-window-header" style={{
        flexShrink: 0, 
        padding: '1rem', 
        borderBottom: '1px solid #e5e8ec',
        marginRight: '-20px'
      }}>
        <h1 style={{margin: 0, fontSize: '1.25rem'}}>{fileName || 'Markdown Preview'}</h1>
      </div>
      <div className="preview-window-content" style={{
        flex: 1, 
        overflow: 'auto', 
        padding: '1rem',
        marginRight: '-20px',
        paddingRight: '1rem'
      }}>
        {isLoading ? (
          <div className="loading">Loading file content...</div>
        ) : error ? (
          <div className="error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
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
            {content || 'No content to preview'}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
};

export default PreviewWindow;