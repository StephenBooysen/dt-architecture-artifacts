/**
 * @fileoverview Template management routes
 * 
 * Provides template system functionality including:
 * - Template creation, retrieval, and management
 * - File-based template storage and organization
 * - Template categorization and metadata
 * - Integration with filing service providers
 * - Support for multiple template formats
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

const express = require('express');
const path = require('path');
const EventEmitter = require('events');
const createFilingService = require('../../services/filing/index.js');

const router = express.Router();

// Fallback filing provider (for backwards compatibility and non-space routes)
var filing = createFilingService('local', {
  localPath: path.join(__dirname, '../../../../content')
}, new EventEmitter());

if (process.env.FILING_PROVIDER === 'git') {
  filing = createFilingService('git', {
    repo: 'https://github.com/StephenBooysen/dt-architecture-artifacts-testing.git',
    localPath: path.join(__dirname, '../../../../temp-content'),
    branch: 'main',
    fetchInterval: 5000
  }, new EventEmitter());
  console.log('Using Git filing provider');
}

/** @const {string} Path to the markdown files directory */
const contentDir = path.join(__dirname, '../../../../content', 'markdown');

/**
 * Ensures the markdown directory exists, creating it if necessary.
 * @return {Promise<void>} Promise that resolves when directory exists
 */
async function ensureContentDir() {
  try {
    const exists = await filing.exists('markdown');
    if (!exists) {
      await filing.mkdir('markdown', {recursive: true});
    }
  } catch (error) {
    await filing.mkdir('markdown', {recursive: true});
  }
}

/**
 * Replaces dynamic placeholders in template content with actual values.
 * @param {string} content - The template content containing placeholders
 * @param {Object} context - Context information for placeholder replacement
 * @param {string} context.folder - Target folder path (empty string for root)
 * @param {string} context.filename - Target filename
 * @param {string} context.user - Current authenticated user
 * @return {string} Content with placeholders replaced
 */
function replacePlaceholders(content, context = {}) {
  if (!content) return content;
  
  const now = new Date();
  
  // Format date and time values
  const datetime = now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const date = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Prepare replacement values
  const replacements = {
    '{datetime}': datetime,
    '{date}': date,
    '{user}': context.user || 'Unknown User',
    '{dayofweek}': dayOfWeek,
    '{folder}': context.folder || '',
    '{filename}': context.filename || ''
  };
  
  // Replace all placeholders
  let processedContent = content;
  for (const [placeholder, value] of Object.entries(replacements)) {
    processedContent = processedContent.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  return processedContent;
}

// Get all templates
router.get('/', async (req, res) => {
  try {
    // Create templates directory if it doesn't exist
    await filing.ensureDir('templates');
    
    const files = await filing.list('templates');
    const templates = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = `templates/${file}`;
        const templateData = JSON.parse(await filing.read(filePath, 'utf8'));
        templates.push(templateData);
      }
    }
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({error: 'Failed to fetch templates'});
  }
});

// Get specific template
router.get('/:templateName', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const filePath = `templates/${templateFile}`;
    
    const templateData = JSON.parse(await filing.read(filePath, 'utf8'));
    res.json(templateData);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(404).json({error: 'Template not found'});
  }
});

// Create new template
router.post('/', async (req, res) => {
  try {
    const { name, content, description } = req.body;
    
    if (!name) {
      return res.status(400).json({error: 'Template name is required'});
    }
    
    // Create templates directory if it doesn't exist
    await filing.ensureDir('templates');
    
    const templateFile = `${name.replace('.md', '')}.json`;
    const filePath = `templates/${templateFile}`;
    
    // Check if template already exists
    const templateExists = await filing.exists(filePath);
    if (templateExists) {
      return res.status(400).json({error: 'Template already exists'});
    }
    
    const templateData = {
      name,
      content: content || '',
      description: description || '',
      createdAt: new Date().toISOString()
    };
    
    await filing.create(filePath, JSON.stringify(templateData, null, 2));
    res.json({message: 'Template created successfully', template: templateData});
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({error: 'Failed to create template'});
  }
});

// Update template
router.put('/:templateName', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const { name, content, description } = req.body;
    
    const oldTemplateFile = `${templateName.replace('.md', '')}.json`;
    const oldFilePath = `templates/${oldTemplateFile}`;
    
    // Read existing template
    const existingTemplate = JSON.parse(await filing.read(oldFilePath, 'utf8'));
    
    // Update template data
    const updatedTemplate = {
      ...existingTemplate,
      name: name || existingTemplate.name,
      content: content !== undefined ? content : existingTemplate.content,
      description: description !== undefined ? description : existingTemplate.description,
      updatedAt: new Date().toISOString()
    };
    
    // If name changed, create new file and delete old one
    if (name && name !== templateName) {
      const newTemplateFile = `${name.replace('.md', '')}.json`;
      const newFilePath = `templates/${newTemplateFile}`;
      
      // Check if new name already exists
      const newNameExists = await filing.exists(newFilePath);
      if (newNameExists) {
        return res.status(400).json({error: 'Template with new name already exists'});
      }
      
      await filing.create(newFilePath, JSON.stringify(updatedTemplate, null, 2));
      await filing.delete(oldFilePath);
    } else {
      await filing.update(oldFilePath, JSON.stringify(updatedTemplate, null, 2));
    }
    
    res.json({message: 'Template updated successfully', template: updatedTemplate});
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({error: 'Failed to update template'});
  }
});

// Delete template
router.delete('/:templateName', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const filePath = `templates/${templateFile}`;
    
    await filing.delete(filePath);
    res.json({message: 'Template deleted successfully'});
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({error: 'Failed to delete template'});
  }
});

// Create file from template with placeholder replacement
router.post('/:templateName/create-file', async (req, res) => {
  try {
    const templateName = req.params.templateName;
    const { filePath, customVariables = {} } = req.body;
    
    if (!filePath) {
      return res.status(400).json({error: 'File path is required'});
    }

    if (!filePath.endsWith('.md')) {
      return res.status(400).json({error: 'Only markdown files (.md) are allowed'});
    }

    // Load the template
    const templateFile = `${templateName.replace('.md', '')}.json`;
    const templateFilePath = `templates/${templateFile}`;
    
    let templateData;
    try {
      templateData = JSON.parse(await filing.read(templateFilePath, 'utf8'));
    } catch (error) {
      return res.status(404).json({error: 'Template not found'});
    }

    // Prepare context for placeholder replacement
    const fileName = path.basename(filePath, '.md');
    const folderPath = path.dirname(filePath);
    const folder = folderPath === '.' ? '' : folderPath;
    const user = req.user ? req.user.username : 'Test User';
    
    const context = {
      folder,
      filename: fileName,
      user
    };

    // Replace dynamic placeholders
    let processedContent = replacePlaceholders(templateData.content || '', context);

    // Replace custom template variables if they exist
    if (templateData.variables || Object.keys(customVariables).length > 0) {
      const allVariables = { ...templateData.variables, ...customVariables };
      
      for (const [key, value] of Object.entries(allVariables)) {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      }
    }

    // Ensure content directory exists
    await ensureContentDir();
    
    const fullPath = path.join(contentDir, filePath);
    
    if (!fullPath.startsWith(contentDir)) {
      return res.status(403).json({error: 'Access denied'});
    }

    // Check if file already exists
    const markdownFilePath = `markdown/${filePath}`;
    const fileExists = await filing.exists(markdownFilePath); // Use relative path with markdown prefix
    if (fileExists) {
      return res.status(409).json({error: 'File already exists'});
    }

    // Ensure directory exists
    await filing.ensureDir(path.dirname(markdownFilePath)); // Use relative path with markdown prefix
    await filing.create(markdownFilePath, processedContent); // Use relative path with markdown prefix
    
    res.json({
      message: 'File created from template successfully', 
      path: filePath,
      templateUsed: templateName,
      placeholdersReplaced: {
        datetime: true,
        date: true,
        user: true,
        dayofweek: true,
        folder: folder !== '',
        filename: true
      }
    });
  } catch (error) {
    console.error('Error creating file from template:', error);
    res.status(500).json({error: 'Failed to create file from template'});
  }
});

module.exports = router;