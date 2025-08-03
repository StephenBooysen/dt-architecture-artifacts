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
 * @param {string} props.currentSpace - The current space name.
 * @return {JSX.Element} The FileDownloader component.
 */
const FileDownloader = ({ filePath, fileName, fileSize, currentSpace }) => {
  const handleDownload = async () => {
    try {
      await downloadFile(filePath, currentSpace);
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
        <div className="file-downloader-controls">
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            title="Download file"
          >
            <i className="bi bi-download me-1"></i>
            Download
          </button>
        </div>
      </div>
      
      <div className="file-downloader-content">
        <div className="download-placeholder">
          <div className="text-center p-5">
            <div className="file-icon-large mb-3">
              <i className="bi bi-file-earmark text-muted" style={{ fontSize: '4rem' }}></i>
            </div>
            <h5 className="text-confluence-text mb-2">{fileName}</h5>
            <p className="text-muted mb-3">Size: {formatFileSize(fileSize)}</p>
            <p className="text-muted">
              This file type is not supported for preview.<br />
              Click the download button above to save it to your computer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FileDownloader);