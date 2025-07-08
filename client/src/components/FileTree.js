import React, {useState} from 'react';

const FileTree = ({
  files,
  onFileSelect,
  selectedFile,
  isLoading,
  onCreateFolder,
  onCreateFile,
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState('file'); // 'file' or 'folder'
  const [createPath, setCreatePath] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());

  const handleCreateClick = (type, basePath = '') => {
    setCreateType(type);
    setCreatePath(basePath);
    setInputValue('');
    setShowCreateDialog(true);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Validate input - no special characters except hyphens and underscores
    const cleanInput = inputValue.trim();
    const invalidChars = /[<>:"/\\|?*]/;
    
    if (invalidChars.test(cleanInput)) {
      alert('Invalid characters detected. Please use only letters, numbers, hyphens, and underscores.');
      return;
    }

    const fullPath = createPath
      ? `${createPath}/${cleanInput}`
      : cleanInput;

    if (createType === 'folder') {
      onCreateFolder(fullPath);
    } else {
      // Ensure .md extension for files
      const fileName = fullPath.endsWith('.md')
        ? fullPath
        : `${fullPath}.md`;
      onCreateFile(fileName);
    }

    setShowCreateDialog(false);
    setInputValue('');
  };

  const handleCreateCancel = () => {
    setShowCreateDialog(false);
    setInputValue('');
  };

  const toggleFolder = (folderPath) => {
    const newCollapsed = new Set(collapsedFolders);
    if (newCollapsed.has(folderPath)) {
      newCollapsed.delete(folderPath);
    } else {
      newCollapsed.add(folderPath);
    }
    setCollapsedFolders(newCollapsed);
  };

  const renderFileItem = (item, depth = 0) => {
    const isSelected = selectedFile === item.path;
    const paddingLeft = depth * 1.5;
    const isCollapsed = collapsedFolders.has(item.path);

    if (item.type === 'directory') {
      return (
        <div key={item.path}>
          <div
            className="file-tree-item directory"
            style={{paddingLeft: `${paddingLeft}rem`}}
            onClick={() => toggleFolder(item.path)}>
            <div className="folder-content">
              <span className="icon">
                {isCollapsed ? '📁' : '📂'}
              </span>
              <span>{item.name}</span>
            </div>
            <div className="file-tree-actions">
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateClick('folder', item.path);
                }}
                title="Create folder">
                📁+
              </button>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateClick('file', item.path);
                }}
                title="Create file">
                📄+
              </button>
            </div>
          </div>
          {!isCollapsed && item.children &&
            item.children.map((child) => renderFileItem(child, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={item.path}
        className={`file-tree-item file ${isSelected ? 'selected' : ''}`}
        style={{paddingLeft: `${paddingLeft}rem`}}
        onClick={() => onFileSelect(item.path)}>
        <span className="icon">📄</span>
        <span>{item.name}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="loading">
        <span>Loading files...</span>
      </div>
    );
  }

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <h3 style={{marginBottom: '1rem', color: '#2c3e50'}}>Files</h3>
        <div className="file-tree-toolbar">
          <button
            className="btn btn-secondary"
            onClick={() => handleCreateClick('folder')}
            disabled={isLoading}
            title="Create new folder">
            📁+
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleCreateClick('file')}
            disabled={isLoading}
            title="Create new file">
            📄+
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="empty-state">
          <h3>No files found</h3>
          <p>Create some markdown files to get started.</p>
        </div>
      ) : (
        files.map((file) => renderFileItem(file))
      )}

      {showCreateDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>
              Create New {createType === 'folder' ? 'Folder' : 'File'}
            </h2>
            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div>
                <label htmlFor="create-name">
                  {createType === 'folder' ? 'Folder' : 'File'} Name:
                </label>
                {createPath && (
                  <p style={{fontSize: '0.9rem', color: '#7f8c8d'}}>
                    Location: {createPath}/
                  </p>
                )}
                <input
                  id="create-name"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    createType === 'folder'
                      ? 'Enter folder name'
                      : 'Enter file name (without .md extension)'
                  }
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCreateCancel}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!inputValue.trim()}>
                  Create {createType === 'folder' ? 'Folder' : 'File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileTree;