import React, { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FileTree from './components/FileTree';
import MarkdownEditor from './components/MarkdownEditor';
import CommitModal from './components/CommitModal';
import {
  fetchFiles,
  fetchFile,
  saveFile,
  commitChanges,
  pushChanges,
  createFolder,
  createFile,
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
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const fileTree = await fetchFiles();
      setFiles(fileTree);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
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

  const handleCommit = async (message) => {
    try {
      setIsLoading(true);
      await commitChanges(message);
      await pushChanges();
      setShowCommitModal(false);
      setHasChanges(false);
      toast.success('Changes committed and pushed successfully');
    } catch (error) {
      toast.error('Failed to commit changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async (folderPath) => {
    try {
      setIsLoading(true);
      await createFolder(folderPath);
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
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!selectedFile || !hasChanges || isLoading}>
            Save
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowCommitModal(true)}
            disabled={!hasChanges || isLoading}>
            Commit & Push
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <FileTree
            files={files}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            isLoading={isLoading}
            onCreateFolder={handleCreateFolder}
            onCreateFile={handleCreateFile}
          />
          <div className="sidebar-resizer" onMouseDown={handleMouseDown}></div>
        </aside>

        <section className="editor-section">
          <MarkdownEditor
            content={fileContent}
            onChange={handleContentChange}
            fileName={selectedFile}
            isLoading={isLoading}
          />
        </section>
      </main>

      {showCommitModal && (
        <CommitModal
          onCommit={handleCommit}
          onCancel={() => setShowCommitModal(false)}
          isLoading={isLoading}
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