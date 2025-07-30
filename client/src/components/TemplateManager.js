/**
 * @fileoverview Template manager component for Architecture Artifacts.
 * 
 * This component provides a simple interface to view templates via the View button.
 * All template creation and editing is now handled via the TemplatesList component.
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React from 'react';

/**
 * TemplateManager component for viewing templates.
 * @param {Object} props - Component properties.
 * @param {Array} props.templates - Array of template objects.
 * @param {Function} props.onTemplateSelect - Callback when template view is selected.
 * @param {boolean} props.isLoading - Loading state.
 * @return {JSX.Element} The TemplateManager component.
 */
const TemplateManager = ({
  templates,
  onTemplateSelect,
  isLoading
}) => {
  return (
    <div className="template-manager">
      <div className="file-tree-header">
        <h3 className="h5 mb-3 fw-semibold text-confluence-text">Templates</h3>
        <div className="d-flex gap-2 file-tree-toolbar">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => onTemplateSelect && onTemplateSelect(null, 'view')}
            title="View all templates"
          >
            <i className="bi bi-grid-3x3-gap me-1"></i>
            View
          </button>
        </div>
      </div>

      <div className="file-tree-content">
        <div className="text-center p-3">
          <p className="mb-2 small text-muted">
            Click "View" to see all templates
          </p>
          <p className="mb-0 small text-muted">
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;