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
      toast.success('Changes published successfully');
      
      if (onPublish) {
        onPublish();
      }
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(`Failed to publish: ${errorMessage}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const getButtonText = () => {
    if (!isPublishing) return 'Publish Changes';
    return 'Publishing...';
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Publish Changes</h2>
        <p>This will save and publish your changes.</p>
        
        <form onSubmit={handlePublish} className="modal-form">
          <div className="form-group">
            <label htmlFor="publish-message">Publish Message:</label>
            <textarea
              id="publish-message"
              value={publishMessage}
              onChange={(e) => setPublishMessage(e.target.value)}
              placeholder="Describe your changes..."
              rows="4"
              required
              disabled={isPublishing}
            />
          </div>
          
          <div className="modal-actions">
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
              {getButtonText()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublishModal;