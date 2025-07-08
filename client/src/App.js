import React, { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FileTree from './components/FileTree';
import MarkdownEditor from './components/MarkdownEditor';
import PublishModal from './components/PublishModal';
import GitIntegration from './components/GitIntegration';
import {
  fetchFiles,
  fetchFile,
  saveFile,
  createFolder,
  createFile,
  deleteItem,
  renameItem,
} from './services/api';
import './App.css';

/**
 * Main App component for the Architecture Artifacts Editor.
 * @return {JSX.Element} The App component.
 */
function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showGitIntegration, setShowGitIntegration] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const fileTree = await fetchFiles();
      setFiles(prevFiles => diffAndUpdateTree(prevFiles, fileTree));
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  // Diff algorithm to only update changed items
  const diffAndUpdateTree = (oldTree, newTree) => {
    // If first load, return new tree
    if (oldTree.length === 0) {
      return newTree;
    }

    // Create maps for quick lookup
    const oldMap = createTreeMap(oldTree);
    const newMap = createTreeMap(newTree);

    // Check if trees are identical
    if (JSON.stringify(oldMap) === JSON.stringify(newMap)) {
      return oldTree; // No changes, keep existing tree
    }

    return newTree; // Return new tree if changes detected
  };

  const createTreeMap = (tree) => {
    const map = {};
    const traverse = (items, parentPath = '') => {
      items.forEach(item => {
        const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
        map[fullPath] = {
          type: item.type,
          name: item.name,
          path: item.path
        };
        if (item.children) {
          traverse(item.children, fullPath);
        }
      });
    };
    traverse(tree);
    return map;
  };

  const handleFileSelect = async (filePath) => {
    try {
      setIsLoading(true);
      const fileData = await fetchFile(filePath);
      setSelectedFile(filePath);
      setFileContent(fileData.content);
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to load file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (newContent) => {
    setFileContent(newContent);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      await saveFile(selectedFile, fileContent);
      setHasChanges(false);
      toast.success('File saved successfully');
    } catch (error) {
      toast.error('Failed to save file');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = () => {
    setShowPublishModal(false);
    setHasChanges(false);
    loadFiles(); // Refresh file tree after publishing
  };

  const handleRepositoryUpdate = () => {
    loadFiles(); // Refresh file tree after git operations
    setSelectedFile(null);
    setFileContent('');
    setHasChanges(false);
    setExpandedFolders(new Set()); // Reset expanded folders after git operations
  };

  const handleCreateFolder = async (folderPath) => {
    try {
      setIsLoading(true);
      await createFolder(folderPath);
      
      // Expand all parent folders of the newly created folder
      const pathParts = folderPath.split('/');
      const newExpanded = new Set(expandedFolders);
      
      // Add all parent paths to expanded set
      for (let i = 0; i < pathParts.length; i++) {
        const parentPath = pathParts.slice(0, i + 1).join('/');
        newExpanded.add(parentPath);
      }
      
      setExpandedFolders(newExpanded);
      await loadFiles(); // Refresh file tree
      toast.success('Folder created successfully');
    } catch (error) {
      toast.error('Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFile = async (filePath) => {
    try {
      setIsLoading(true);
      await createFile(filePath);
      
      // Expand all parent folders of the newly created file
      const pathParts = filePath.split('/');
      const newExpanded = new Set(expandedFolders);
      
      // Add all parent directory paths to expanded set (exclude the file itself)
      for (let i = 0; i < pathParts.length - 1; i++) {
        const parentPath = pathParts.slice(0, i + 1).join('/');
        newExpanded.add(parentPath);
      }
      
      setExpandedFolders(newExpanded);
      await loadFiles(); // Refresh file tree
      toast.success('File created successfully');
      // Automatically open the newly created file
      await handleFileSelect(filePath);
    } catch (error) {
      toast.error('Failed to create file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemPath) => {
    try {
      setIsLoading(true);
      await deleteItem(itemPath);
      await loadFiles(); // Refresh file tree
      
      // If the deleted item was the currently selected file, clear the selection
      if (selectedFile === itemPath) {
        setSelectedFile(null);
        setFileContent('');
        setHasChanges(false);
      }
      
      toast.success('Item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameItem = async (itemPath, newName) => {
    try {
      setIsLoading(true);
      const result = await renameItem(itemPath, newName);
      await loadFiles(); // Refresh file tree
      
      // If the renamed item was the currently selected file, update the selection
      if (selectedFile === itemPath) {
        setSelectedFile(result.newPath);
      }
      
      toast.success('Item renamed successfully');
    } catch (error) {
      toast.error('Failed to rename item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    const minWidth = 200;
    const maxWidth = 600;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Architecture Artifacts Editor</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowGitIntegration(!showGitIntegration)}
            disabled={isLoading}>
            Git Integration
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!selectedFile || !hasChanges || isLoading}>
            Save
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowPublishModal(true)}
            disabled={!hasChanges || isLoading}>
            Publish
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div className="sidebar-content">
            {showGitIntegration && (
              <GitIntegration onRepositoryUpdate={handleRepositoryUpdate} />
            )}
            <FileTree
              files={files}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              isLoading={isLoading}
              onCreateFolder={handleCreateFolder}
              onCreateFile={handleCreateFile}
              onDeleteItem={handleDeleteItem}
              onRenameItem={handleRenameItem}
              expandedFolders={expandedFolders}
              onFolderToggle={(folderPath, isExpanded) => {
                const newExpanded = new Set(expandedFolders);
                if (isExpanded) {
                  newExpanded.add(folderPath);
                } else {
                  newExpanded.delete(folderPath);
                }
                setExpandedFolders(newExpanded);
              }}
            />
          </div>
          <div className="sidebar-resizer" onMouseDown={handleMouseDown}></div>
        </aside>

        <section className="editor-section">
          <MarkdownEditor
            content={fileContent}
            onChange={handleContentChange}
            fileName={selectedFile}
            isLoading={isLoading}
            onRename={handleRenameItem}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>© 2025 All rights reserved.</p>
      </footer>

      {showPublishModal && (
        <PublishModal
          onPublish={handlePublish}
          onClose={() => setShowPublishModal(false)}
        />
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App;