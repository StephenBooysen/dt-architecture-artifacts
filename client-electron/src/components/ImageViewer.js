/**
 * @fileoverview Image viewer component for Architecture Artifacts.
 * 
 * This component provides an interactive image viewing experience with features
 * like fullscreen mode, zoom controls, and image download functionality. It
 * handles various image formats and provides error handling for failed loads.
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState } from 'react';

/**
 * ImageViewer component for displaying images.
 * @param {Object} props - Component properties.
 * @param {string} props.content - Base64 encoded image content.
 * @param {string} props.fileName - The image file name.
 * @return {JSX.Element} The ImageViewer component.
 */
const ImageViewer = ({ content, fileName }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!content) {
    return (
      <div className="file-viewer-error">
        <p>No image content available</p>
      </div>
    );
  }

  // Determine image type from filename
  const getImageType = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'image/jpeg';
    }
  };

  const imageType = getImageType(fileName);
  const imageDataUrl = `data:${imageType};base64,${content}`;

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`image-viewer ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="image-viewer-header">
        <h3>{fileName}</h3>
        <div className="image-viewer-controls">
          <button
            className="btn btn-secondary"
            onClick={downloadImage}
            title="Download image"
          >
            Download
          </button>
          <button
            className="btn btn-primary"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>
      
      <div className="image-viewer-content">
        {imageError ? (
          <div className="image-error">
            <p>Error loading image</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : (
          <>
            {!imageLoaded && (
              <div className="image-loading">
                <p>Loading image...</p>
              </div>
            )}
            <img
              src={imageDataUrl}
              alt={fileName}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                display: imageLoaded ? 'block' : 'none',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          </>
        )}
      </div>
      
      {isFullscreen && (
        <div className="fullscreen-overlay" onClick={toggleFullscreen}>
          <img
            src={imageDataUrl}
            alt={fileName}
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(ImageViewer);