/**
 * @fileoverview Templates list component for the main content area.
 * 
 * This component displays all templates in a card-based layout similar to the UI mockup.
 * Users can view, edit, create, and delete templates from this interface.
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { useState } from 'react';
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateTags, setTemplateTags] = useState('');
  const [templateVariables, setTemplateVariables] = useState('{}');
  const [highlightedTemplate, setHighlightedTemplate] = useState(null);

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

      const newTemplate = {
        name: templateName.trim(),
        content: templateContent,
        description: templateDescription.trim(),
        tags: templateTags.trim(),
        variables: variables
      };
      
      await onTemplateCreate(newTemplate);
      
      setShowCreateForm(false);
      setHighlightedTemplate(templateName.trim());
      resetForm();
      toast.success('Template created successfully');
      
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedTemplate(null), 3000);
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
    setTemplateTags('');
    setTemplateVariables('{}');
  };

  const closeModals = () => {
    setShowCreateForm(false);
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
    <div className="templates-list-view p-4 confluence-bg">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 text-confluence-text mb-1">
            {showCreateForm ? 'Create New Template' : 'Templates'}
          </h2>
          <p className="text-muted mb-0">
            {showCreateForm ? 'Fill in the details below to create a new template.' : `Displaying ${templates.length} template${templates.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
        {showCreateForm ? (
          <button
            className="btn btn-secondary"
            onClick={() => setShowCreateForm(false)}
          >
            <i className="bi bi-x-lg me-2"></i>
            Cancel
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
            disabled={isLoading}
          >
            <i className="bi bi-plus-lg me-2"></i>
            Create Template
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card shadow-sm border-0 home-section-card">
          <div className="card-body p-4 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p className="text-muted">Loading templates...</p>
            </div>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="card shadow-sm border-0 home-section-card">
          <div className="card-body p-4 text-center" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div className="mb-4">
              <i className="bi bi-file-earmark-plus display-1 text-muted"></i>
            </div>
            <h3 className="h4 mb-2">No templates found</h3>
            <p className="text-muted mb-4">Create your first template to get started with standardized content.</p>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Create Your First Template
            </button>
          </div>
        </div>
      ) : showCreateForm ? (
        <div className="card shadow-sm border-0 home-section-card">
          <div className="card-body p-4">
            <form onSubmit={handleCreateTemplate}>
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
                <label htmlFor="template-tags" className="form-label">Tags:</label>
                <input
                  id="template-tags"
                  type="text"
                  className="form-control"
                  value={templateTags}
                  onChange={(e) => setTemplateTags(e.target.value)}
                  placeholder="e.g., financial, personal, meeting"
                />
                <div className="form-text">Separate multiple tags with commas</div>
              </div>
              
              <div className="mb-3">
                <label htmlFor="template-content" className="form-label">Template Content:</label>
                <textarea
                  id="template-content"
                  className="form-control"
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder="Enter your markdown template content here..."
                  rows={12}
                />
              </div>

              <div className="mb-4">
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
              
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-lg me-2"></i>
                  Save Template
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                  <i className="bi bi-x-lg me-2"></i>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0 home-section-card">
          <div className="card-body p-4">
            <div className="row">
              {templates.map((template) => (
                <div key={template.name} className="col-lg-3 col-md-4 col-6 mb-3">
                  <div className={`home-dashboard-block p-3 h-100 position-relative ${highlightedTemplate === template.name ? 'border-primary border-2' : ''}`}>
                    <div 
                      className="h-100 cursor-pointer"
                      onClick={() => handleTemplateClick(template)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex align-items-start mb-2">
                        <i className={`bi ${getTemplateIcon(template).icon} ${getTemplateIcon(template).color} me-2 flex-shrink-0`} style={{ fontSize: '1.2rem' }}></i>
                        <div className="flex-grow-1 min-width-0">
                          <h6 className="mb-1 text-confluence-text text-truncate fw-medium" title={template.name}>
                            {template.name.replace('.md', '')}
                            {highlightedTemplate === template.name && <span className="badge bg-success ms-1 small">New</span>}
                          </h6>
                        </div>
                      </div>
                      <div className="small text-muted">
                        <div className="mb-1">
                          <span className="badge bg-secondary badge-sm">{getTemplateCategory(template)}</span>
                          {template.tags && (
                            <span className="ms-1 badge bg-info badge-sm">{template.tags}</span>
                          )}
                        </div>
                        {template.description && (
                          <div className="mb-2 text-truncate" title={template.description} style={{ fontSize: '0.7rem', opacity: '0.8' }}>
                            {template.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="position-absolute" style={{ top: '0.5rem', right: '0.5rem', zIndex: 10 }}>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateClick(template);
                        }}
                        title="Edit Template"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Edit Template Modal */}
      {showEditModal && (
                <div 
          className={`modal fade ${showEditModal ? 'show' : ''}`} 
          style={{ display: showEditModal ? 'block' : 'none' }}
          tabIndex="-1"
          onClick={closeModals}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Template Settings</h5>
                <button type="button" className="btn-close" onClick={closeModals} aria-label="Close"></button>
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