/**
 * @fileoverview Standalone preview window component for Architecture Artifacts.
 * 
 * This component renders markdown content in a dedicated preview window that
 * can be opened separately from the main application. It provides a clean,
 * distraction-free environment for viewing rendered markdown content with
 * syntax highlighting and GitHub Flavored Markdown support.
 * 
 * @author Architecture Artifacts Team
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
    <div className="preview-window">
      <div className="preview-window-header">
        <h1>{fileName || 'Markdown Preview'}</h1>
      </div>
      <div className="preview-window-content">
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