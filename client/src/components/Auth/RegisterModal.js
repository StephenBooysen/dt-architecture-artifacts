import React, { useState } from 'react';
import './AuthModal.css';

const RegisterModal = ({ isOpen, onClose, onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Auto-login after successful registration
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            username: formData.username,
            password: formData.password
          }),
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          onSuccess(loginData.user);
        }
        
        onClose();
        setFormData({ username: '', password: '', confirmPassword: '' });
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-button" onClick={onClose} aria-label="Close">
          <i className="bi bi-x-lg"></i>
        </button>
        
        <div className="auth-modal-content">
          <div className="text-center mb-4">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-3">
              <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#0052cc" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 22V12" stroke="#0052cc" strokeWidth="2"/>
              <path d="M2 7L12 12L22 7" stroke="#0052cc" strokeWidth="2"/>
            </svg>
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Join Architecture Artifacts to start documenting.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
                autoFocus
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                minLength="6"
              />
              <div className="form-text">Password must be at least 6 characters long.</div>
            </div>
            
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                minLength="6"
              />
            </div>
            
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          
          <div className="auth-switch text-center mt-3">
            <p className="text-muted mb-0">
              Already have an account?{' '}
              <button type="button" onClick={onSwitchToLogin} className="btn btn-link p-0">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;