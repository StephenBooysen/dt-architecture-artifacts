/**
 * @fileoverview User Settings component for password and space management.
 * 
 * This component provides a settings interface for users to:
 * - Change their password with validation
 * - Select/unselect available public spaces
 * - Automatically includes Personal space
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { useState, useEffect } from 'react';
import './UserSettings.css';
import { toast } from 'react-toastify';
import { fetchUserSpaces, fetchAllSpaces, updateUserSettings, getApiKeys, generateApiKey, updateApiKey, revokeApiKey } from '../services/api';

/**
 * UserSettings component for managing user password and space access.
 * @param {Object} props - Component properties.
 * @param {Object} props.user - Current user object.
 * @param {Function} props.onSettingsUpdate - Callback when settings are updated.
 * @param {Function} props.onCancel - Callback when cancel button is clicked.
 * @return {JSX.Element} The UserSettings component.
 */
const UserSettings = ({ user, onSettingsUpdate, onCancel }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [availableSpaces, setAvailableSpaces] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState(['Personal']); // Always include Personal
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [errors, setErrors] = useState({});
  
  // API Key management state
  const [apiKeys, setApiKeys] = useState([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(true);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKeyForm, setApiKeyForm] = useState({ name: '', description: '' });
  const [editingApiKey, setEditingApiKey] = useState(null);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState(null);

  // Load available spaces and API keys on component mount
  useEffect(() => {
    loadAvailableSpaces();
    loadApiKeys();
  }, []);

  const loadAvailableSpaces = async () => {
    try {
      setIsLoadingSpaces(true);
      
      // Fetch all spaces and filter to public ones + Personal
      const allSpaces = await fetchAllSpaces();
      const publicSpaces = allSpaces.filter(space => 
        space.visibility === 'public' || space.space === 'Personal'
      );
      
      setAvailableSpaces(publicSpaces);
      
      // Set currently selected spaces
      const currentSpaces = user?.spaces ? user.spaces.split(',').map(s => s.trim()) : ['Personal'];
      setSelectedSpaces(currentSpaces.includes('Personal') ? currentSpaces : ['Personal', ...currentSpaces]);
    } catch (error) {
      console.error('Failed to load spaces:', error);
      toast.error('Failed to load available spaces');
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      setIsLoadingApiKeys(true);
      const response = await getApiKeys();
      setApiKeys(response.apiKeys || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const handleGenerateApiKey = async (e) => {
    e.preventDefault();
    
    if (!apiKeyForm.name.trim()) {
      toast.error('API key name is required');
      return;
    }

    try {
      const response = await generateApiKey({
        name: apiKeyForm.name.trim(),
        description: apiKeyForm.description.trim()
      });
      
      setNewlyGeneratedKey(response.apiKey);
      setApiKeyForm({ name: '', description: '' });
      setShowApiKeyForm(false);
      await loadApiKeys(); // Reload the list
      toast.success('API key generated successfully');
    } catch (error) {
      console.error('Failed to generate API key:', error);
      toast.error('Failed to generate API key: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleUpdateApiKey = async (keyId, updateData) => {
    try {
      await updateApiKey(keyId, updateData);
      setEditingApiKey(null);
      await loadApiKeys(); // Reload the list
      toast.success('API key updated successfully');
    } catch (error) {
      console.error('Failed to update API key:', error);
      toast.error('Failed to update API key: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRevokeApiKey = async (keyId, keyName) => {
    if (!window.confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await revokeApiKey(keyId);
      await loadApiKeys(); // Reload the list
      toast.success('API key revoked successfully');
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      toast.error('Failed to revoke API key: ' + (error.response?.data?.error || error.message));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const validateForm = () => {
    const newErrors = {};

    // Password validation (only if user is trying to change password)
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password';
      }
      
      if (!newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters long';
      }
      
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your new password';
      } else if (newPassword !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Spaces validation
    if (selectedSpaces.length === 0) {
      newErrors.spaces = 'At least one space must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSpaceToggle = (spaceSlug) => {
    if (spaceSlug === 'Personal') {
      // Cannot unselect Personal space
      return;
    }

    setSelectedSpaces(prev => {
      if (prev.includes(spaceSlug)) {
        return prev.filter(s => s !== spaceSlug);
      } else {
        return [...prev, spaceSlug];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      
      const updateData = {
        spaces: selectedSpaces.join(', ')
      };

      // Only include password fields if user is changing password
      if (newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      await updateUserSettings(updateData);
      
      toast.success('Settings updated successfully');
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      
      // Notify parent component
      if (onSettingsUpdate) {
        onSettingsUpdate({
          ...user,
          spaces: selectedSpaces.join(', ')
        });
      }
      
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    
    // Reset spaces to original user spaces
    const currentSpaces = user?.spaces ? user.spaces.split(',').map(s => s.trim()) : ['Personal'];
    setSelectedSpaces(currentSpaces.includes('Personal') ? currentSpaces : ['Personal', ...currentSpaces]);
    
    // Navigate back to Home view
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="user-settings-view p-4 confluence-bg user-settings-scrollable">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 text-confluence-text mb-1">User Settings</h2>
          <p className="text-muted mb-0">
            Manage your password and space access preferences.
          </p>
        </div>
      </div>

      <div className="card shadow-sm border-0 home-section-card">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            {/* Password Change Section */}
            <div className="mb-4">
              <h5 className="text-confluence-text mb-3">Change Password</h5>
              <p className="text-muted small mb-3">Leave blank to keep current password</p>
              
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label htmlFor="current-password" className="form-label">Current Password:</label>
                  <input
                    id="current-password"
                    type="password"
                    className={`form-control ${errors.currentPassword ? 'is-invalid' : ''}`}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  {errors.currentPassword && (
                    <div className="invalid-feedback">{errors.currentPassword}</div>
                  )}
                </div>
                
                <div className="col-md-4 mb-3">
                  <label htmlFor="new-password" className="form-label">New Password:</label>
                  <input
                    id="new-password"
                    type="password"
                    className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  {errors.newPassword && (
                    <div className="invalid-feedback">{errors.newPassword}</div>
                  )}
                </div>
                
                <div className="col-md-4 mb-3">
                  <label htmlFor="confirm-password" className="form-label">Confirm Password:</label>
                  <input
                    id="confirm-password"
                    type="password"
                    className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  {errors.confirmPassword && (
                    <div className="invalid-feedback">{errors.confirmPassword}</div>
                  )}
                </div>
              </div>
            </div>

            <hr />

            {/* Space Selection Section */}
            <div className="mb-4">
              <h5 className="text-confluence-text mb-3">Space Access</h5>
              <p className="text-muted small mb-3">Select which spaces you want access to. Personal space is always included.</p>
              
              {isLoadingSpaces ? (
                <div className="d-flex justify-content-center p-4">
                  <div className="spinner-border text-primary me-2" role="status"></div>
                  <span className="text-muted">Loading spaces...</span>
                </div>
              ) : (
                <div className="row">
                  {availableSpaces.map((space) => (
                    <div key={space.space} className="col-md-6 col-lg-4 mb-3">
                      <div className={`card h-100 ${selectedSpaces.includes(space.space) ? 'border-primary' : ''}`}>
                        <div className="card-body">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`space-${space.space}`}
                              checked={selectedSpaces.includes(space.space)}
                              onChange={() => handleSpaceToggle(space.space)}
                              disabled={space.space === 'Personal'} // Cannot unselect Personal
                            />
                            <label className="form-check-label" htmlFor={`space-${space.space}`}>
                              <div className="d-flex align-items-center">
                                <i className={`bi ${space.space === 'Personal' ? 'bi-person-fill' : 'bi-people-fill'} me-2 text-primary`}></i>
                                <div>
                                  <h6 className="mb-1">{space.space}</h6>
                                  <small className="text-muted">
                                    {space.description || `Access to ${space.space} space`}
                                    {space.space === 'Personal' && ' (Required)'}
                                  </small>
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {errors.spaces && (
                <div className="text-danger small mt-2">{errors.spaces}</div>
              )}
            </div>

            <hr />

            {/* API Key Management Section */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="text-confluence-text mb-0">API Keys</h5>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowApiKeyForm(true)}
                >
                  <i className="bi bi-plus-lg me-2"></i>
                  Generate API Key
                </button>
              </div>
              <p className="text-muted small mb-3">
                Generate API keys for external applications and services to access your personal space.
              </p>

              {/* Newly Generated Key Alert */}
              {newlyGeneratedKey && (
                <div className="alert alert-success alert-dismissible" role="alert">
                  <h6 className="alert-heading">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    API Key Generated Successfully
                  </h6>
                  <p className="mb-2">
                    <strong>Key Name:</strong> {newlyGeneratedKey.name}
                  </p>
                  <p className="mb-2">
                    <strong>API Key:</strong>
                  </p>
                  <div className="input-group mb-2">
                    <input 
                      type="text" 
                      className="form-control font-monospace" 
                      value={newlyGeneratedKey.key} 
                      readOnly 
                    />
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button"
                      onClick={() => copyToClipboard(newlyGeneratedKey.key)}
                    >
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                  <small className="text-muted">
                    This is the only time the full API key will be shown. Please copy it now.
                  </small>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setNewlyGeneratedKey(null)}
                  ></button>
                </div>
              )}

              {/* API Key Form */}
              {showApiKeyForm && (
                <div className="card border-primary mb-3">
                  <div className="card-header bg-primary bg-opacity-10">
                    <h6 className="mb-0">Generate New API Key</h6>
                  </div>
                  <div className="card-body">
                    <div>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label htmlFor="api-key-name" className="form-label">Name*</label>
                          <input
                            id="api-key-name"
                            type="text"
                            className="form-control"
                            value={apiKeyForm.name}
                            onChange={(e) => setApiKeyForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Server Watcher"
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label htmlFor="api-key-description" className="form-label">Description</label>
                          <input
                            id="api-key-description"
                            type="text"
                            className="form-control"
                            value={apiKeyForm.description}
                            onChange={(e) => setApiKeyForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-primary" onClick={handleGenerateApiKey}>
                          <i className="bi bi-key me-2"></i>
                          Generate Key
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowApiKeyForm(false);
                            setApiKeyForm({ name: '', description: '' });
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* API Keys List */}
              {isLoadingApiKeys ? (
                <div className="d-flex justify-content-center p-4">
                  <div className="spinner-border text-primary me-2" role="status"></div>
                  <span className="text-muted">Loading API keys...</span>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center text-muted p-4">
                  <i className="bi bi-key display-6 d-block mb-2"></i>
                  <p>No API keys generated yet.</p>
                  <p className="small">Generate your first API key to get started.</p>
                </div>
              ) : (
                <div className="row">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="col-12 mb-3">
                      <div className="card">
                        <div className="card-body">
                          {editingApiKey === key.id ? (
                            <EditApiKeyForm 
                              apiKey={key}
                              onSave={(updateData) => handleUpdateApiKey(key.id, updateData)}
                              onCancel={() => setEditingApiKey(null)}
                            />
                          ) : (
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <h6 className="mb-1">{key.name}</h6>
                                {key.description && (
                                  <p className="text-muted small mb-2">{key.description}</p>
                                )}
                                <div className="d-flex align-items-center gap-3 small text-muted">
                                  <span>
                                    <strong>Key:</strong> {key.keyPreview}
                                  </span>
                                  <span>
                                    <strong>Created:</strong> {new Date(key.createdAt).toLocaleDateString()}
                                  </span>
                                  {key.lastUsed && (
                                    <span>
                                      <strong>Last used:</strong> {new Date(key.lastUsed).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="d-flex gap-2">
                                <button 
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => setEditingApiKey(key.id)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleRevokeApiKey(key.id, key.name)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="d-flex gap-2">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-2"></i>
                    Save Settings
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <i className="bi bi-x-lg me-2"></i>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Helper component for editing API keys
const EditApiKeyForm = ({ apiKey, onSave, onCancel }) => {
  const [name, setName] = useState(apiKey.name);
  const [description, setDescription] = useState(apiKey.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('API key name is required');
      return;
    }
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <div>
      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor={`edit-name-${apiKey.id}`} className="form-label">Name*</label>
          <input
            id={`edit-name-${apiKey.id}`}
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="col-md-6 mb-3">
          <label htmlFor={`edit-description-${apiKey.id}`} className="form-label">Description</label>
          <input
            id={`edit-description-${apiKey.id}`}
            type="text"
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <div className="d-flex gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit}>
          <i className="bi bi-check-lg me-2"></i>
          Save
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
          <i className="bi bi-x-lg me-2"></i>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default UserSettings;