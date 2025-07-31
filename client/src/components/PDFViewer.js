/**
 * @fileoverview PDF viewer component for Architecture Artifacts.
 * 
 * This component provides functionality to display PDF files within the
 * application interface. It handles base64-encoded PDF content and provides
 * controls for downloading and viewing PDF documents in embedded format.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState, useEffect, useRef } from 'react';

/**
 * PDFViewer component for displaying PDF files.
 * @param {Object} props - Component properties.
 * @param {string} props.content - Base64 encoded PDF content.
 * @param {string} props.fileName - The PDF file name.
 * @return {JSX.Element} The PDFViewer component.
 */
const PDFViewer = ({ content, fileName }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useEmbed, setUseEmbed] = useState(false);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    if (!content) {
      setError('No PDF content available');
      setIsLoading(false);
      return;
    }

    try {
      // Convert base64 to binary data
      const binaryString = atob(content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and object URL
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      objectUrlRef.current = url;
      setPdfUrl(url);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError('Failed to load PDF file');
      setIsLoading(false);
    }

    // Cleanup function to revoke object URL
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [content]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-viewer-header">
          <h3>{fileName}</h3>
        </div>
        <div className="pdf-viewer-content">
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p className="text-muted">Loading PDF...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-viewer-header">
          <h3>{fileName}</h3>
        </div>
        <div className="file-viewer-error">
          <div className="text-center">
            <i className="bi bi-file-earmark-pdf text-danger mb-3" style={{ fontSize: '3rem' }}></i>
            <p className="text-danger mb-3">{error}</p>
            <p className="text-muted small">
              If you're having trouble viewing the PDF, try downloading it instead.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer-header">
        <h3>{fileName}</h3>
        <div className="pdf-viewer-controls">
          <button
            onClick={handleDownload}
            className="btn btn-secondary"
            title="Download PDF"
            disabled={!pdfUrl}
          >
            <i className="bi bi-download me-1"></i>
            Download
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="btn btn-primary"
            title="Open in new tab"
            disabled={!pdfUrl}
          >
            <i className="bi bi-box-arrow-up-right me-1"></i>
            Open in New Tab
          </button>
        </div>
      </div>
      <div className="pdf-viewer-content">
        {pdfUrl ? (
          <div style={{ position: 'relative', height: '100%', minHeight: '600px' }}>
            {!useEmbed ? (
              <iframe
                src={pdfUrl}
                width="100%"
                height="100%"
                title={fileName}
                style={{ border: 'none' }}
                onLoad={() => console.log('PDF loaded successfully')}
                onError={() => {
                  console.log('Iframe failed, trying embed element');
                  setUseEmbed(true);
                }}
              />
            ) : (
              <embed
                src={pdfUrl}
                type="application/pdf"
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                onError={() => setError('PDF cannot be displayed in this browser')}
              />
            )}
            
            {/* Fallback message overlay */}
            <div 
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                opacity: useEmbed ? 1 : 0,
                transition: 'opacity 0.3s'
              }}
            >
              If PDF doesn't display, try the "Open in New Tab" button
            </div>
          </div>
        ) : (
          <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
            <p className="text-muted">PDF not available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PDFViewer);