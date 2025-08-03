import React, { useState, useEffect } from 'react';
import { fetchUserSpaces } from '../services/api';

/**
 * SpaceSelector component for switching between different content spaces.
 * @param {Object} props - Component properties.
 * @param {string} props.currentSpace - Currently selected space name.
 * @param {Function} props.onSpaceChange - Callback when space is changed.
 * @param {boolean} props.isAuthenticated - Whether user is authenticated.
 * @return {JSX.Element} The SpaceSelector component.
 */
const SpaceSelector = ({ currentSpace, onSpaceChange, isAuthenticated }) => {
  const [spaces, setSpaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadSpaces();
    }
  }, [isAuthenticated]);

  const loadSpaces = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userSpaces = await fetchUserSpaces();
      setSpaces(userSpaces);
      
      // If no current space is selected, select the default space
      if (!currentSpace && userSpaces.length > 0) {
        // Prefer "Personal" space if available, otherwise use the first space
        const personalSpace = userSpaces.find(space => space.space === 'Personal');
        const defaultSpace = personalSpace ? personalSpace.space : userSpaces[0].space;
        onSpaceChange(defaultSpace);
      }
    } catch (err) {
      console.error('Error loading spaces:', err);
      setError('Failed to load spaces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpaceChange = (event) => {
    const selectedSpace = event.target.value;
    onSpaceChange(selectedSpace);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-selector">
      <div className="space-selector-header">
        <h6 className="space-selector-title">
          <i className="bi bi-collection me-2"></i>
          Current Space
        </h6>
      </div>
      
      <div className="space-selector-content">
        {isLoading ? (
          <div className="space-loading">
            <i className="bi bi-hourglass-split me-2"></i>
            Loading spaces...
          </div>
        ) : error ? (
          <div className="space-error">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        ) : spaces.length === 0 ? (
          <div className="space-empty">
            <i className="bi bi-info-circle me-2"></i>
            No spaces available
          </div>
        ) : (
          <div className="space-dropdown">
            <select 
              className="form-select form-select-sm"
              value={currentSpace || ''}
              onChange={handleSpaceChange}
            >
              <option value="">Select a space...</option>
              {spaces.map((space) => (
                <option key={space.space} value={space.space}>
                  {space.space} ({space.access})
                </option>
              ))}
            </select>
            
            {currentSpace && (
              <div className="space-info">
                {(() => {
                  const selectedSpaceInfo = spaces.find(s => s.space === currentSpace);
                  if (selectedSpaceInfo) {
                    return (
                      <div className="space-details">
                        <div className="space-detail">
                          <strong>Access:</strong> {selectedSpaceInfo.access}
                        </div>
                        <div className="space-detail">
                          <strong>Type:</strong> {selectedSpaceInfo.filing.type}
                        </div>
                        {selectedSpaceInfo.filing.type === 'git' && (
                          <div className="space-detail">
                            <strong>Repository:</strong> 
                            <small className="text-muted d-block">
                              {selectedSpaceInfo.filing.git}
                            </small>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .space-selector {
          background: var(--confluence-bg-card);
          border: 1px solid var(--confluence-border);
          border-radius: 8px;
          margin-bottom: 1rem;
          overflow: hidden;
        }
        
        .space-selector-header {
          background: var(--confluence-border-subtle);
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--confluence-border);
        }
        
        .space-selector-title {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--confluence-text);
          display: flex;
          align-items: center;
        }
        
        .space-selector-content {
          padding: 1rem;
        }
        
        .space-loading,
        .space-error,
        .space-empty {
          display: flex;
          align-items: center;
          font-size: 0.875rem;
          color: var(--confluence-text-subtle);
          padding: 0.5rem 0;
        }
        
        .space-error {
          color: var(--confluence-danger);
        }
        
        .space-dropdown .form-select {
          border: 1px solid var(--confluence-border);
          font-size: 0.875rem;
          background-color: var(--confluence-bg-card);
          color: var(--confluence-text);
        }
        
        .space-dropdown .form-select:focus {
          border-color: var(--confluence-primary);
          box-shadow: 0 0 0 0.2rem rgba(0, 82, 204, 0.25);
        }
        
        .space-info {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--confluence-border);
        }
        
        .space-details {
          font-size: 0.75rem;
        }
        
        .space-detail {
          margin-bottom: 0.5rem;
          color: var(--confluence-text);
        }
        
        .space-detail strong {
          color: var(--confluence-text);
          font-weight: 600;
        }
        
        .space-detail small {
          font-size: 0.7rem;
          word-break: break-all;
          line-height: 1.3;
        }
        
        .space-detail:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default SpaceSelector;