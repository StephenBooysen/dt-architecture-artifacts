/**
 * @fileoverview Text file viewer component for Architecture Artifacts.
 * 
 * This component provides a feature-rich text viewing experience with options
 * for line numbers, text wrapping, and syntax highlighting. It supports
 * various text file formats and provides download functionality.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState } from 'react';

/**
 * TextViewer component for displaying text files.
 * @param {Object} props - Component properties.
 * @param {string} props.content - The text content.
 * @param {string} props.fileName - The text file name.
 * @return {JSX.Element} The TextViewer component.
 */
const TextViewer = ({ content, fileName }) => {
  const [wrapText, setWrapText] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  if (!content) {
    return (
      <div className="file-viewer-error">
        <p>No text content available</p>
      </div>
    );
  }

  const downloadText = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => {
      // You could add a toast notification here
      alert('Content copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  // Get appropriate language for syntax highlighting based on file extension
  const getLanguage = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
      case 'js':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'jsx':
        return 'jsx';
      case 'tsx':
        return 'tsx';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'md':
      case 'markdown':
        return 'markdown';
      default:
        return 'text';
    }
  };

  const language = getLanguage(fileName);
  const lines = content.split('\n');

  return (
    <div className="text-viewer">
      <div className="text-viewer-header">
        <h3>{fileName}</h3>
        <div className="text-viewer-controls">
          <label>
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => setShowLineNumbers(e.target.checked)}
            />
            Line Numbers
          </label>
          <label>
            <input
              type="checkbox"
              checked={wrapText}
              onChange={(e) => setWrapText(e.target.checked)}
            />
            Wrap Text
          </label>
          <button
            className="btn btn-secondary"
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            Copy
          </button>
          <button
            className="btn btn-secondary"
            onClick={downloadText}
            title="Download file"
          >
            Download
          </button>
        </div>
      </div>
      
      <div className="text-viewer-content">
        <pre className={`text-content ${language} ${wrapText ? 'wrap' : 'no-wrap'}`}>
          {showLineNumbers ? (
            <div className="text-with-line-numbers">
              <div className="line-numbers">
                {lines.map((_, index) => (
                  <span key={index} className="line-number">
                    {index + 1}
                  </span>
                ))}
              </div>
              <div className="text-lines">
                <code>{content}</code>
              </div>
            </div>
          ) : (
            <code>{content}</code>
          )}
        </pre>
      </div>
    </div>
  );
};

export default React.memo(TextViewer);