import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * PreviewWindow component for displaying markdown content in a standalone window.
 * @return {JSX.Element} The PreviewWindow component.
 */
const PreviewWindow = () => {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    // Get content and filename from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const fileParam = urlParams.get('file');
    const contentParam = urlParams.get('content');

    if (fileParam) {
      setFileName(decodeURIComponent(fileParam));
    }
    if (contentParam) {
      setContent(decodeURIComponent(contentParam));
    }

    // Set page title
    if (fileParam) {
      document.title = `Preview: ${decodeURIComponent(fileParam)}`;
    } else {
      document.title = 'Markdown Preview';
    }
  }, []);

  return (
    <div className="preview-window">
      <div className="preview-window-header">
        <h1>{fileName || 'Markdown Preview'}</h1>
      </div>
      <div className="preview-window-content">
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
      </div>
    </div>
  );
};

export default PreviewWindow;