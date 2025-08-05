/**
 * @fileoverview New Markdown File creation form for the content pane.
 * 
 * This component renders a form in the main content area that allows users to:
 * - Enter a filename for the new markdown file
 * - Select a template from available templates
 * - Preview the selected template content
 * - Create the file or cancel the operation
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchTemplates } from '../services/api';

/**
 * NewMarkdownForm component for creating new markdown files with template selection.
 * @param {Object} props - Component properties.
 * @param {string} props.currentSpace - Current workspace/space.
 * @param {Function} props.onCreateFile - Callback when file is created.
 * @param {Function} props.onCancel - Callback when creation is cancelled.
 * @return {JSX.Element} The NewMarkdownForm component.
 */
const NewMarkdownForm = ({ currentSpace, onCreateFile, onCancel }) => {
  const [filename, setFilename] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [templatePreview, setTemplatePreview] = useState('');

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoading(true);
        const templatesData = await fetchTemplates(currentSpace);
        setTemplates(templatesData || []);
      } catch (error) {
        console.error('Failed to load templates:', error);
        toast.error('Failed to load templates');
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [currentSpace]);

  // Update template preview when template selection changes
  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.name === selectedTemplate);
      setTemplatePreview(template?.content || '');
    } else {
      setTemplatePreview('');
    }
  }, [selectedTemplate, templates]);

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!filename.trim()) {
      toast.error('Filename is required');
      return;
    }

    // Ensure .md extension
    const fullFilename = filename.trim().endsWith('.md') 
      ? filename.trim() 
      : `${filename.trim()}.md`;

    try {
      setIsLoading(true);
      
      // Get template content if template is selected
      const templateContent = selectedTemplate && templates.length > 0
        ? templates.find(t => t.name === selectedTemplate)?.content || ''
        : '';

      // Create the file with template content
      await onCreateFile(fullFilename, templateContent);
      
      toast.success('File created successfully');
    } catch (error) {
      console.error('Failed to create file:', error);
      toast.error('Failed to create file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFilename('');
    setSelectedTemplate('');
    setTemplatePreview('');
    onCancel();
  };

  return (
    <div className="new-markdown-form confluence-bg p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 text-confluence-text mb-1">Create New Markdown File</h2>
          <p className="text-muted mb-0">
            Enter a filename and optionally select a template to get started.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleCancel}
          disabled={isLoading}
        >
          <i className="bi bi-x-lg me-2"></i>
          Cancel
        </button>
      </div>

      <div className="card shadow-sm border-0 home-section-card">
        <div className="card-body p-4">
          <form onSubmit={handleCreate}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="filename" className="form-label">
                    File Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="filename"
                    type="text"
                    className="form-control"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="my-document"
                    required
                    autoFocus
                    disabled={isLoading}
                  />
                  <div className="form-text">
                    The .md extension will be added automatically if not provided.
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="template-select" className="form-label">
                    Template (Optional)
                  </label>
                  {isLoading ? (
                    <div className="d-flex align-items-center">
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading templates...</span>
                    </div>
                  ) : (
                    <select
                      id="template-select"
                      className="form-select"
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      disabled={isLoading}
                    >
                      <option value="">No template (blank file)</option>
                      {templates.map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.name}
                          {template.description && ` - ${template.description}`}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="form-text">
                    Select a template to pre-populate your new file with content.
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!filename.trim() || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-earmark-plus me-2"></i>
                        Create File
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="col-md-6">
                <div className="template-preview">
                  <label className="form-label">Template Preview</label>
                  <div 
                    className="form-control template-preview-area"
                    style={{ 
                      height: '300px', 
                      overflowY: 'auto',
                      backgroundColor: '#f8f9fa',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {selectedTemplate ? (
                      templatePreview || 'Loading template preview...'
                    ) : (
                      <span className="text-muted">
                        Select a template to see its content preview here.
                      </span>
                    )}
                  </div>
                  {selectedTemplate && (
                    <div className="form-text">
                      This is the content that will be added to your new file.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewMarkdownForm;