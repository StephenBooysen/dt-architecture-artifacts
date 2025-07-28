/**
 * @fileoverview Template manager component for Architecture Artifacts.
 * 
 * This component provides functionality to manage markdown templates including
 * creating, editing, deleting, and organizing templates. Templates can be used
 * when creating new markdown files to provide pre-defined content structures.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

/**
 * TemplateManager component for managing markdown templates.
 * @param {Object} props - Component properties.
 * @param {Array} props.templates - Array of template objects.
 * @param {Function} props.onTemplateSelect - Callback when template is selected.
 * @param {Function} props.onTemplateCreate - Callback when template is created.
 * @param {Function} props.onTemplateEdit - Callback when template is edited.
 * @param {Function} props.onTemplateDelete - Callback when template is deleted.
 * @param {boolean} props.isLoading - Loading state.
 * @return {JSX.Element} The TemplateManager component.
 */
const TemplateManager = ({
  templates,
  onTemplateSelect,
  onTemplateCreate,
  onTemplateEdit,
  onTemplateDelete,
  isLoading
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!templateName.endsWith('.md')) {
      toast.error('Template name must end with .md');
      return;
    }

    try {
      await onTemplateCreate({
        name: templateName.trim(),
        content: templateContent,
        description: templateDescription.trim()
      });
      
      setShowCreateModal(false);
      setTemplateName('');
      setTemplateContent('');
      setTemplateDescription('');
      toast.success('Template created successfully');
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleEditTemplate = async (e) => {
    e.preventDefault();
    
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      await onTemplateEdit(editingTemplate.name, {
        name: templateName.trim(),
        content: templateContent,
        description: templateDescription.trim()
      });
      
      setShowEditModal(false);
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateContent('');
      setTemplateDescription('');
      toast.success('Template updated successfully');
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateName) => {
    if (window.confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
      try {
        await onTemplateDelete(templateName);
        toast.success('Template deleted successfully');
      } catch (error) {
        toast.error('Failed to delete template');
      }
    }
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content || '');
    setTemplateDescription(template.description || '');
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateContent('');
    setTemplateDescription('');
  };

  return (
    <div className="template-manager">
      <div className="template-manager-header">
        <h2>Templates</h2>
        <div className="template-toolbar">
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            disabled={isLoading}
            title="Create new template"
          >
            + New Template
          </button>
        </div>
      </div>

      <div className="template-list">
        {isLoading ? (
          <div className="loading">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <p>No templates available. Create your first template to get started.</p>
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.name} className="template-item">
              <div className="template-content">
                <div className="template-name">{template.name}</div>
                {template.description && (
                  <div className="template-description">{template.description}</div>
                )}
              </div>
              <div className="template-actions">
                <button
                  className="action-btn"
                  onClick={() => onTemplateSelect && onTemplateSelect(template)}
                  title="Use this template"
                >
                  Use
                </button>
                <button
                  className="action-btn"
                  onClick={() => openEditModal(template)}
                  title="Edit template"
                >
                  Edit
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteTemplate(template.name)}
                  title="Delete template"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create New Template</h2>
            <form onSubmit={handleCreateTemplate} className="modal-form">
              <div className="form-group">
                <label htmlFor="template-name">Template Name:</label>
                <input
                  id="template-name"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., meeting-notes.md"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="template-description">Description (optional):</label>
                <input
                  id="template-description"
                  type="text"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="template-content">Template Content:</label>
                <textarea
                  id="template-content"
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder="Enter your markdown template content here..."
                  rows={10}
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Template</h2>
            <form onSubmit={handleEditTemplate} className="modal-form">
              <div className="form-group">
                <label htmlFor="edit-template-name">Template Name:</label>
                <input
                  id="edit-template-name"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-template-description">Description (optional):</label>
                <input
                  id="edit-template-description"
                  type="text"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-template-content">Template Content:</label>
                <textarea
                  id="edit-template-content"
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder="Enter your markdown template content here..."
                  rows={10}
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;