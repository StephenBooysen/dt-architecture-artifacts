/**
 * @fileoverview Templates list component for the main content area.
 * 
 * This component displays all templates in a card-based layout similar to the UI mockup.
 * Users can view, edit, create, and delete templates from this interface.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState } from 'react';
import { toast } from 'react-toastify';

/**
 * TemplatesList component for displaying and managing templates in the main content area.
 * @param {Object} props - Component properties.
 * @param {Array} props.templates - Array of template objects.
 * @param {Function} props.onTemplateEdit - Callback when template is edited.
 * @param {Function} props.onTemplateCreate - Callback when template is created.
 * @param {Function} props.onTemplateDelete - Callback when template is deleted.
 * @param {Function} props.onTemplateSelect - Callback when template is selected for editing.
 * @param {boolean} props.isLoading - Loading state.
 * @return {JSX.Element} The TemplatesList component.
 */
const TemplatesList = ({
  templates,
  onTemplateEdit,
  onTemplateCreate,
  onTemplateDelete,
  onTemplateSelect,
  isLoading
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateVariables, setTemplateVariables] = useState('{}');

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      let variables = {};
      if (templateVariables.trim()) {
        try {
          variables = JSON.parse(templateVariables);
        } catch (error) {
          toast.error('Invalid JSON format for variables');
          return;
        }
      }

      await onTemplateCreate({
        name: templateName.trim(),
        content: templateContent,
        description: templateDescription.trim(),
        variables: variables
      });
      
      setShowCreateModal(false);
      resetForm();
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
      let variables = {};
      if (templateVariables.trim()) {
        try {
          variables = JSON.parse(templateVariables);
        } catch (error) {
          toast.error('Invalid JSON format for variables');
          return;
        }
      }

      await onTemplateEdit(editingTemplate.name, {
        name: templateName.trim(),
        content: templateContent,
        description: templateDescription.trim(),
        variables: variables
      });
      
      setShowEditModal(false);
      setEditingTemplate(null);
      resetForm();
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
    setTemplateVariables(JSON.stringify(template.variables || {}, null, 2));
    setShowEditModal(true);
  };

  const resetForm = () => {
    setTemplateName('');
    setTemplateContent('');
    setTemplateDescription('');
    setTemplateVariables('{}');
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingTemplate(null);
    resetForm();
  };

  const handleTemplateClick = (template) => {
    // Open template for editing in the main editor
    if (onTemplateSelect) {
      onTemplateSelect(template, 'edit');
    }
  };

  const getTemplateIcon = (template) => {
    const name = template.name?.toLowerCase() || '';
    if (name.includes('meeting')) return { icon: 'bi-calendar-event', color: 'text-primary' };
    if (name.includes('adr') || name.includes('decision')) return { icon: 'bi-clipboard-check', color: 'text-success' };
    if (name.includes('architecture') || name.includes('software')) return { icon: 'bi-diagram-3', color: 'text-danger' };
    if (name.includes('project') || name.includes('plan')) return { icon: 'bi-kanban', color: 'text-warning' };
    if (name.includes('retrospective')) return { icon: 'bi-arrow-clockwise', color: 'text-info' };
    if (name.includes('roadmap')) return { icon: 'bi-signpost', color: 'text-secondary' };
    if (name.includes('sprint')) return { icon: 'bi-speedometer2', color: 'text-primary' };
    if (name.includes('feedback') || name.includes('daily')) return { icon: 'bi-chat-square-text', color: 'text-info' };
    if (name.includes('note')) return { icon: 'bi-journal-text', color: 'text-muted' };
    return { icon: 'bi-file-earmark-text', color: 'text-muted' };
  };

  const getTemplateCategory = (template) => {
    const name = template.name?.toLowerCase() || '';
    if (name.includes('meeting')) return 'Meetings';
    if (name.includes('adr') || name.includes('decision')) return 'Documentation';
    if (name.includes('architecture')) return 'Software';
    if (name.includes('project') || name.includes('plan')) return 'Strategy';
    if (name.includes('retrospective')) return 'Teamwork';
    return 'Popular';
  };

  return (
    <div className="templates-list-container">
      <div className="templates-header">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="h3 mb-1">Templates</h2>
            <p className="text-muted mb-0">
              Displaying {templates.length} template{templates.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            disabled={isLoading}
          >
            <i className="bi bi-plus-lg me-2"></i>
            Create Template
          </button>
        </div>
      </div>

      <div className="templates-content">
        {isLoading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p className="text-muted">Loading templates...</p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div className="mb-4">
              <i className="bi bi-file-earmark-plus display-1 text-muted"></i>
            </div>
            <h3 className="h4 mb-2">No templates found</h3>
            <p className="text-muted mb-4">Create your first template to get started with standardized content.</p>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="row g-4">
            {templates.map((template) => (
              <div key={template.name} className="col-12 col-md-6 col-lg-4">
                <div className="card template-card h-100">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex align-items-start mb-3">
                      <div className="template-icon me-3">
                        <i className={`bi ${getTemplateIcon(template).icon} fs-2 ${getTemplateIcon(template).color}`}></i>
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="card-title mb-1">{template.name}</h5>
                        <span className="badge bg-secondary small">{getTemplateCategory(template)}</span>
                      </div>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => openEditModal(template)}
                          title="Edit Settings"
                        >
                          <i className="bi bi-gear"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteTemplate(template.name)}
                          title="Delete Template"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                    
                    {template.description && (
                      <p className="card-text text-muted small mb-3">{template.description}</p>
                    )}
                    
                    <div className="mt-auto">
                      <button
                        className="btn btn-primary w-100"
                        onClick={() => handleTemplateClick(template)}
                      >
                        <i className="bi bi-pencil me-2"></i>
                        Edit Template
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(9, 30, 66, 0.54)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={closeModals}
        >
          <div className="modal-dialog" style={{ margin: 0, maxWidth: '800px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Template</h5>
                <button type="button" className="btn-close" onClick={closeModals}></button>
              </div>
              <form onSubmit={handleCreateTemplate}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="template-name" className="form-label">Template Name:</label>
                      <input
                        id="template-name"
                        type="text"
                        className="form-control"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., meeting-notes"
                        required
                      />
                    </div>
                    
                    <div className="col-md-6 mb-3">
                      <label htmlFor="template-description" className="form-label">Description:</label>
                      <input
                        id="template-description"
                        type="text"
                        className="form-control"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Brief description of this template"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="template-content" className="form-label">Template Content:</label>
                    <textarea
                      id="template-content"
                      className="form-control"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      placeholder="Enter your markdown template content here..."
                      rows={8}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="template-variables" className="form-label">Variables (JSON):</label>
                    <textarea
                      id="template-variables"
                      className="form-control font-monospace"
                      value={templateVariables}
                      onChange={(e) => setTemplateVariables(e.target.value)}
                      placeholder='{"variable1": "default value", "variable2": "another value"}'
                      rows={4}
                    />
                    <div className="form-text">Define default values for template variables in JSON format.</div>
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
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(9, 30, 66, 0.54)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={closeModals}
        >
          <div className="modal-dialog" style={{ margin: 0, maxWidth: '800px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Template Settings</h5>
                <button type="button" className="btn-close" onClick={closeModals}></button>
              </div>
              <form onSubmit={handleEditTemplate}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
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
                    
                    <div className="col-md-6 mb-3">
                      <label htmlFor="edit-template-description" className="form-label">Description:</label>
                      <input
                        id="edit-template-description"
                        type="text"
                        className="form-control"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Brief description of this template"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="edit-template-content" className="form-label">Template Content:</label>
                    <textarea
                      id="edit-template-content"
                      className="form-control"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      placeholder="Enter your markdown template content here..."
                      rows={8}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="edit-template-variables" className="form-label">Variables (JSON):</label>
                    <textarea
                      id="edit-template-variables"
                      className="form-control font-monospace"
                      value={templateVariables}
                      onChange={(e) => setTemplateVariables(e.target.value)}
                      placeholder='{"variable1": "default value", "variable2": "another value"}'
                      rows={4}
                    />
                    <div className="form-text">Define default values for template variables in JSON format.</div>
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

export default TemplatesList;