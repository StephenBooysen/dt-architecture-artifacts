import React, { useState } from 'react';

const CommitModal = ({ onCommit, onCancel, isLoading }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onCommit(message.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Commit Changes</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <div>
            <label htmlFor="commit-message">Commit Message:</label>
            <textarea
              id="commit-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a commit message describing your changes..."
              rows="4"
              required
              disabled={isLoading}
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!message.trim() || isLoading}
            >
              {isLoading ? 'Committing...' : 'Commit & Push'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommitModal;