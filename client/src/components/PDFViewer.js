import React from 'react';

/**
 * PDFViewer component for displaying PDF files.
 * @param {Object} props - Component properties.
 * @param {string} props.content - Base64 encoded PDF content.
 * @param {string} props.fileName - The PDF file name.
 * @return {JSX.Element} The PDFViewer component.
 */
const PDFViewer = ({ content, fileName }) => {
  if (!content) {
    return (
      <div className="file-viewer-error">
        <p>No PDF content available</p>
      </div>
    );
  }

  // Create data URL for the PDF
  const pdfDataUrl = `data:application/pdf;base64,${content}`;

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer-header">
        <h3>{fileName}</h3>
        <div className="pdf-viewer-controls">
          <a
            href={pdfDataUrl}
            download={fileName}
            className="btn btn-secondary"
            title="Download PDF"
          >
            Download
          </a>
          <a
            href={pdfDataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            title="Open in new tab"
          >
            Open in New Tab
          </a>
        </div>
      </div>
      <div className="pdf-viewer-content">
        <iframe
          src={pdfDataUrl}
          width="100%"
          height="100%"
          title={fileName}
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
};

export default React.memo(PDFViewer);