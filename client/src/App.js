import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FileTree from './components/FileTree';
import MarkdownEditor from './components/MarkdownEditor';
import CommitModal from './components/CommitModal';
import { fetchFiles, fetchFile, saveFile, commitChanges, pushChanges } from './services/api';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Architecture Artifacts Editor</h1>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!selectedFile || !hasChanges || isLoading}
          >
            Save
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setShowCommitModal(true)}
            disabled={!hasChanges || isLoading}
          >
            Commit & Push
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <FileTree 
            files={files} 
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            isLoading={isLoading}
          />
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