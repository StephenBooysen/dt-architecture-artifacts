import React, { useState } from 'react';
import { cloneRepository, pullRepository } from '../services/api';
import { toast } from 'react-toastify';

/**
 * GitIntegration component for managing git operations.
 * @param {Object} props - Component properties.
 * @param {Function} props.onRepositoryUpdate - Callback when repository is updated.
 * @return {JSX.Element} The GitIntegration component.
 */
const GitIntegration = ({ onRepositoryUpdate }) => {
  const [isCloning, setIsCloning] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');

  const handleClone = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      toast.error('Repository URL is required');
      return;
    }

    setIsCloning(true);
    try {
      await cloneRepository(repoUrl.trim(), branch);
      toast.success('Repository cloned successfully');
      setRepoUrl('');
      if (onRepositoryUpdate) {
        onRepositoryUpdate();
      }
    } catch (error) {
      toast.error('Failed to clone repository: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsCloning(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
      await pullRepository(branch);
      toast.success('Repository updated successfully');
      if (onRepositoryUpdate) {
        onRepositoryUpdate();
      }
    } catch (error) {
      toast.error('Failed to pull repository: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="git-integration">
      <h3>Git Integration</h3>
      
      <form onSubmit={handleClone} className="git-form">
        <h4>Clone Repository</h4>
        <div className="form-group">
          <label htmlFor="repo-url">Repository URL:</label>
          <input
            id="repo-url"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repository.git"
            disabled={isCloning}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="branch">Branch:</label>
          <input
            id="branch"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            disabled={isCloning}
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isCloning || !repoUrl.trim()}
        >
          {isCloning ? 'Cloning...' : 'Clone Repository'}
        </button>
      </form>

      <div className="git-actions">
        <h4>Repository Actions</h4>
        <button 
          onClick={handlePull}
          className="btn btn-secondary"
          disabled={isPulling}
        >
          {isPulling ? 'Pulling...' : 'Pull Latest Changes'}
        </button>
      </div>
    </div>
  );
};

export default GitIntegration;