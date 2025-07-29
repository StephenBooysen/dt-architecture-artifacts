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
  isLoading,
  selectedFile
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

  // Handle template click to edit
  const handleTemplateClick = (template) => {
    // Use the onTemplateSelect callback to signal that we want to edit this template
    if (onTemplateSelect) {
      onTemplateSelect(template, 'edit');
    }
  };

  // Handle right-click context menu
  const [contextMenu, setContextMenu] = useState(null);
  
  const handleContextMenu = (e, template) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      template: template
    });
  };

  // Close context menu when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="template-manager">
      <div className="file-tree-header">
        <h3 className="h5 mb-3 fw-semibold text-confluence-text">Templates</h3>
        <div className="d-flex gap-2 file-tree-toolbar">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCreateModal(true)}
            disabled={isLoading}
            title="Create new template"
          >
            <i className="bi bi-file-earmark-plus"></i>
          </button>
        </div>
      </div>

      <div className="file-tree-content">
        {isLoading ? (
          <div className="d-flex justify-content-center p-4 loading">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            <span className="small text-muted">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center p-4 empty-state">
            <h3 className="h6 fw-medium mb-2">No templates found</h3>
            <p className="mb-0 small text-muted">Create your first template to get started.</p>
          </div>
        ) : (
          templates.map((template) => {
            const isSelected = selectedFile === `templates/${template.name}`;
            return (
              <div
                key={template.name}
                className={`file-tree-item file template-file ${isSelected ? 'selected' : ''}`}
                onClick={() => handleTemplateClick(template)}
                onContextMenu={(e) => handleContextMenu(e, template)}
                title={template.description || 'Click to edit template'}
              >
                <span className="icon">
                  <i className="bi bi-file-earmark-text"></i>
                </span>
                <span className="template-name">{template.name}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000
          }}
        >
          <div
            className="context-menu-item delete-item"
            onClick={() => {
              handleDeleteTemplate(contextMenu.template.name);
              setContextMenu(null);
            }}
          >
            <i className="bi bi-trash context-menu-icon"></i>
            Delete Template
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(9, 30, 66, 0.54)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Template</h5>
                <button type="button" className="btn-close" onClick={closeModals}></button>
              </div>
              <form onSubmit={handleCreateTemplate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="template-name" className="form-label">Template Name:</label>
                    <input
                      id="template-name"
                      type="text"
                      className="form-control"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., meeting-notes.md"
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="template-description" className="form-label">Description (optional):</label>
                    <input
                      id="template-description"
                      type="text"
                      className="form-control"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Brief description of this template"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="template-content" className="form-label">Template Content:</label>
                    <textarea
                      id="template-content"
                      className="form-control"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      placeholder="Enter your markdown template content here..."
                      rows={10}
                    />
                  </div>
                </div>
                
                <div className="modal-footer">
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
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(9, 30, 66, 0.54)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Template</h5>
                <button type="button" className="btn-close" onClick={closeModals}></button>
              </div>
              <form onSubmit={handleEditTemplate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="edit-template-name" className="form-label">Template Name:</label>
                    <input
                      id="edit-template-name"
                      type="text"
                      className="form-control"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="edit-template-description" className="form-label">Description (optional):</label>
                    <input
                      id="edit-template-description"
                      type="text"
                      className="form-control"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Brief description of this template"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="edit-template-content" className="form-label">Template Content:</label>
                    <textarea
                      id="edit-template-content"
                      className="form-control"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      placeholder="Enter your markdown template content here..."
                      rows={10}
                    />
                  </div>
                </div>
                
                <div className="modal-footer">
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
        </div>
      )}
    </div>
  );
};

export default TemplateManager;