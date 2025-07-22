/**
 * @fileoverview File downloader component for Architecture Artifacts.
 * 
 * This component provides a user interface for downloading files that cannot
 * be displayed directly in the browser. It includes file size formatting,
 * download progress indication, and error handling for file downloads.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React from 'react';
import { downloadFile } from '../services/api';

/**
 * FileDownloader component for handling file downloads.
 * @param {Object} props - Component properties.
 * @param {string} props.filePath - The path to the file.
 * @param {string} props.fileName - The file name.
 * @param {number} props.fileSize - The file size in bytes.
 * @return {JSX.Element} The FileDownloader component.
 */
const FileDownloader = ({ filePath, fileName, fileSize }) => {
  const handleDownload = async () => {
    try {
      await downloadFile(filePath);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-downloader">
      <div className="file-downloader-header">
        <h3>{fileName}</h3>
        <p className="file-info">Size: {formatFileSize(fileSize)}</p>
      </div>
      
      <div className="file-downloader-content">
        <div className="download-info">
          <div className="file-icon">
            📄
          </div>
          <div className="file-details">
            <p className="file-name">{fileName}</p>
            <p className="file-size">{formatFileSize(fileSize)}</p>
            <p className="file-description">
              This file type is not supported for preview. Click download to save it to your computer.
            </p>
          </div>
        </div>
        
        <div className="download-actions">
          <button
            className="btn btn-primary download-btn"
            onClick={handleDownload}
          >
            Download File
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FileDownloader);