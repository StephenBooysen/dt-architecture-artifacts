/**
 * @fileoverview Publish modal component for Architecture Artifacts.
 * 
 * This component provides a publishing interface that saves changes.
 * Git operations are handled on the server side.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState } from 'react';
import { toast } from 'react-toastify';

/**
 * PublishModal component for publishing changes.
 * @param {Object} props - Component properties.
 * @param {Function} props.onClose - Callback for closing the modal.
 * @param {Function} props.onPublish - Callback after successful publish.
 * @return {JSX.Element} The PublishModal component.
 */
const PublishModal = ({ onClose, onPublish }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!publishMessage.trim()) {
      toast.error('Publish message is required');
      return;
    }

    setIsPublishing(true);
    
    try {
      // Make API call to commit changes
      const response = await fetch('/api/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          message: publishMessage.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish changes');
      }

      const result = await response.json();
      
      toast.success('Changes published successfully to Git repository');
      console.log('Publish result:', result);
      
      if (onPublish) {
        onPublish(result);
      }
      onClose();
    } catch (error) {
      const errorMessage = error.message || 'Failed to publish changes';
      toast.error(`Failed to publish: ${errorMessage}`);
      console.error('Publish error:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  const getButtonText = () => {
    if (!isPublishing) return 'Publish Changes';
    return 'Publishing...';
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(9, 30, 66, 0.54)'}}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Publish Changes</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={isPublishing}></button>
          </div>
          <form onSubmit={handlePublish}>
            <div className="modal-body">
              <p className="text-muted mb-3">This will commit and push your changes to the Git repository.</p>
              <div className="mb-3">
                <label htmlFor="publish-message" className="form-label">Commit Message:</label>
                <textarea
                  id="publish-message"
                  className="form-control"
                  value={publishMessage}
                  onChange={(e) => setPublishMessage(e.target.value)}
                  placeholder="Describe your changes..."
                  rows="4"
                  required
                  disabled={isPublishing}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isPublishing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!publishMessage.trim() || isPublishing}
              >
                {isPublishing && (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                )}
                {getButtonText()}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;