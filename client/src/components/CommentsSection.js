/**
 * @fileoverview Comments section component for markdown files.
 * 
 * This component displays and manages comments for markdown files. It shows
 * all existing comments with author and timestamp information, and provides
 * an interface for adding new comments. Comments are visible in both edit
 * and view modes of the markdown editor.
 * 
 * Key features:
 * - Display comments sorted by newest first
 * - Add new comments with user authentication
 * - Edit/delete own comments
 * - Responsive design matching glassmorphism theme
 * - Real-time comment updates
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import React, { useState, useEffect } from 'react';
import { getComments, addComment, updateComment, deleteComment } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * CommentsSection component for displaying and managing file comments.
 * @param {Object} props - Component properties.
 * @param {string} props.fileName - The current file name/path.
 * @param {boolean} props.isVisible - Whether the comments section should be visible.
 * @return {JSX.Element} The CommentsSection component.
 */
const CommentsSection = ({ fileName, isVisible = true }) => {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [error, setError] = useState(null);

  // Load comments when file changes
  useEffect(() => {
    if (fileName && fileName.endsWith('.md')) {
      loadComments();
    } else {
      setComments([]);
    }
  }, [fileName]);

  /**
   * Loads comments for the current file.
   */
  const loadComments = async () => {
    if (!fileName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getComments(fileName);
      setComments(response.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      setError('Failed to load comments');
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles adding a new comment.
   */
  const handleAddComment = async () => {
    if (!newCommentContent.trim() || !isAuthenticated) {
      return;
    }

    setAddingComment(true);
    setError(null);
    
    try {
      const response = await addComment(fileName, newCommentContent.trim());
      setComments(response.comments || []);
      setNewCommentContent('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setError(error.response?.data?.error || 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  /**
   * Handles editing an existing comment.
   */
  const handleEditComment = async (commentId) => {
    if (!editingContent.trim()) {
      return;
    }

    setError(null);
    
    try {
      const response = await updateComment(fileName, commentId, editingContent.trim());
      setComments(response.comments || []);
      setEditingCommentId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Error updating comment:', error);
      setError(error.response?.data?.error || 'Failed to update comment');
    }
  };

  /**
   * Handles deleting a comment.
   */
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setError(null);
    
    try {
      const response = await deleteComment(fileName, commentId);
      setComments(response.comments || []);
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError(error.response?.data?.error || 'Failed to delete comment');
    }
  };

  /**
   * Starts editing a comment.
   */
  const startEditing = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  /**
   * Cancels editing a comment.
   */
  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  /**
   * Formats a timestamp for display.
   */
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Don't render if not visible or not a markdown file
  if (!isVisible || !fileName || !fileName.endsWith('.md')) {
    return null;
  }

  return (
    <div className="comments-section mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 text-confluence-text">
          <i className="bi bi-chat-left-text me-2"></i>
          Comments ({comments.length})
        </h5>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Add new comment form */}
      {isAuthenticated && (
        <div className="comment-form mb-4 p-3 border rounded" style={{
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}>
          <div className="mb-3">
            <label htmlFor="new-comment" className="form-label small text-confluence-text">
              Add a comment as <strong>{user?.username}</strong>:
            </label>
            <textarea
              id="new-comment"
              className="form-control"
              rows="3"
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              placeholder="Write your comment here..."
              disabled={addingComment}
            />
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddComment}
              disabled={!newCommentContent.trim() || addingComment}
            >
              {addingComment ? (
                <>
                  <div className="spinner-border spinner-border-sm me-1" role="status"></div>
                  Adding...
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle me-1"></i>
                  Add Comment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Please log in to add comments.
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading comments...</span>
          </div>
          <p className="text-muted mt-2">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <i className="bi bi-chat-left-text display-4 mb-3 d-block"></i>
          <p className="mb-0">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="comment-item mb-3 p-3 border rounded"
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(5px)',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
              }}
            >
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="comment-header">
                  <strong className="text-confluence-text">{comment.author}</strong>
                  <small className="text-muted ms-2">
                    {formatTimestamp(comment.timestamp)}
                    {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                      <span className="ms-1">(edited)</span>
                    )}
                  </small>
                </div>
                {isAuthenticated && user?.username === comment.author && (
                  <div className="comment-actions">
                    <div className="btn-group btn-group-sm">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => startEditing(comment)}
                        title="Edit comment"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => handleDeleteComment(comment.id)}
                        title="Delete comment"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {editingCommentId === comment.id ? (
                <div className="edit-form">
                  <textarea
                    className="form-control mb-2"
                    rows="3"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                  />
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleEditComment(comment.id)}
                      disabled={!editingContent.trim()}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Save
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={cancelEditing}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="comment-content">
                  <p className="mb-0 text-confluence-text" style={{ whiteSpace: 'pre-wrap' }}>
                    {comment.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;