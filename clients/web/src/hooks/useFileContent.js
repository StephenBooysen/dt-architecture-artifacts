/**
 * @fileoverview Custom hook for file content management.
 * Handles file selection, content loading, editing, and saving operations.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchFile, saveFile, downloadFile } from '../services/api';
import { constructFileURL } from '../utils/urlUtils';

/**
 * Custom hook for managing file content operations
 */
export function useFileContent(currentSpace, isAuthenticated) {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileData, setFileData] = useState(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  /**
   * Handles file selection and loading of file content
   */
  const handleFileSelect = useCallback(async (filePath, updateURL = true) => {
    // Don't reload if the same file is already selected
    if (selectedFile === filePath) {
      return;
    }
    
    // Don't attempt to load if not authenticated or no current space
    if (!isAuthenticated || !currentSpace) {
      console.warn('Cannot load file: not authenticated or no current space');
      return;
    }
    
    try {
      setIsFileLoading(true);
      const data = await fetchFile(filePath, currentSpace);
      setSelectedFile(filePath);
      setFileData(data);
      setFileContent(data.content || '');
      setHasChanges(false);
      
      // Check if this is a template file and set editing state
      setIsEditingTemplate(filePath.startsWith('templates/'));
      
      // Update URL if requested (default behavior)
      if (updateURL && currentSpace) {
        const fileURL = constructFileURL(currentSpace, filePath);
        navigate(fileURL);
      }
      
      // Handle downloadable files
      if (data.downloadable) {
        try {
          await downloadFile(filePath, currentSpace);
        } catch (downloadError) {
          toast.error('Failed to download file');
        }
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      toast.error('Failed to load file');
    } finally {
      setIsFileLoading(false);
    }
  }, [selectedFile, currentSpace, navigate, isAuthenticated]);

  /**
   * Handles content changes in the editor
   */
  const handleContentChange = useCallback((newContent) => {
    setFileContent(newContent);
    setHasChanges(true);
  }, []);

  /**
   * Saves the current file content to the server
   */
  const handleSave = useCallback(async (onTemplateEdit = null) => {
    if (!selectedFile) return;

    try {
      setIsFileLoading(true);
      
      // Check if this is a template file
      if (fileData?.isTemplate && selectedFile.startsWith('templates/')) {
        if (onTemplateEdit) {
          const templateName = selectedFile.replace('templates/', '');
          await onTemplateEdit(templateName, {
            name: templateName,
            content: fileContent,
            description: fileData.description || ''
          });
          setHasChanges(false);
          toast.success('Template saved successfully');
        }
      } else {
        // Regular file save
        await saveFile(selectedFile, fileContent, currentSpace);
        setHasChanges(false);
        toast.success('File saved successfully');
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      toast.error('Failed to save file');
    } finally {
      setIsFileLoading(false);
    }
  }, [selectedFile, fileContent, currentSpace, fileData]);

  /**
   * Clears the current file selection and content
   */
  const clearFileSelection = useCallback(() => {
    setSelectedFile(null);
    setFileContent('');
    setFileData(null);
    setHasChanges(false);
    setIsEditingTemplate(false);
  }, []);

  /**
   * Updates the selected file path (for renames)
   */
  const updateSelectedFilePath = useCallback((newPath) => {
    setSelectedFile(newPath);
  }, []);

  /**
   * Sets template editing mode
   */
  const setTemplateEditing = useCallback((isEditing) => {
    setIsEditingTemplate(isEditing);
  }, []);

  /**
   * Sets file data externally
   */
  const setFileDataExternal = useCallback((data) => {
    setFileData(data);
  }, []);

  return {
    // State
    selectedFile,
    fileContent,
    fileData,
    isFileLoading,
    hasChanges,
    isEditingTemplate,
    
    // Actions
    handleFileSelect,
    handleContentChange,
    handleSave,
    clearFileSelection,
    updateSelectedFilePath,
    setTemplateEditing,
    setFileDataExternal,
    
    // Setters for external use
    setSelectedFile,
    setFileContent,
    setHasChanges
  };
}