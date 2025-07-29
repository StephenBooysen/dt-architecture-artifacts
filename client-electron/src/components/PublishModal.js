/**
 * @fileoverview Publish modal component for Architecture Artifacts.
 * 
 * This component provides a comprehensive publishing interface that handles
 * both Git commit and push operations in a single workflow. It guides users
 * through the process of committing changes and pushing them to the remote
 * repository with appropriate progress indicators and error handling.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState } from 'react';
import { commitChanges, pushChanges } from '../services/api';
import { toast } from 'react-toastify';

/**
 * PublishModal component for publishing changes to git repository.
 * @param {Object} props - Component properties.
 * @param {Function} props.onClose - Callback for closing the modal.
 * @param {Function} props.onPublish - Callback after successful publish.
 * @return {JSX.Element} The PublishModal component.
 */
const PublishModal = ({ onClose, onPublish }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [currentStep, setCurrentStep] = useState('commit'); // 'commit' or 'push'

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }

    setIsPublishing(true);
    
    try {
      // Step 1: Commit changes
      setCurrentStep('commit');
      await commitChanges(commitMessage.trim());
      toast.success('Changes committed successfully');
      
      // Step 2: Push changes
      setCurrentStep('push');
      await pushChanges();
      toast.success('Changes published successfully');
      
      if (onPublish) {
        onPublish();
      }
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(`Failed to ${currentStep}: ${errorMessage}`);
    } finally {
      setIsPublishing(false);
      setCurrentStep('commit');
    }
  };

  const getButtonText = () => {
    if (!isPublishing) return 'Publish Changes';
    if (currentStep === 'commit') return 'Committing...';
    return 'Publishing...';
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Publish Changes</h2>
        <p>This will commit your changes and push them to the remote repository.</p>
        
        <form onSubmit={handlePublish} className="modal-form">
          <div className="form-group">
            <label htmlFor="commit-message">Commit Message:</label>
            <textarea
              id="commit-message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
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
              disabled={!commitMessage.trim() || isPublishing}
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