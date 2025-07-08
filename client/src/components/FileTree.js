import React from 'react';

const FileTree = ({ files, onFileSelect, selectedFile, isLoading }) => {
  const renderFileItem = (item, depth = 0) => {
    const isSelected = selectedFile === item.path;
    const paddingLeft = depth * 1.5;

    if (item.type === 'directory') {
      return (
        <div key={item.path}>
          <div 
            className="file-tree-item directory" 
            style={{ paddingLeft: `${paddingLeft}rem` }}
          >
            <span className="icon">📁</span>
            <span>{item.name}</span>
          </div>
          {item.children && item.children.map(child => renderFileItem(child, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={item.path}
        className={`file-tree-item file ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${paddingLeft}rem` }}
        onClick={() => onFileSelect(item.path)}
      >
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

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <h3>No files found</h3>
        <p>Create some markdown files in the content folder to get started.</p>
      </div>
    );
  }

  return (
    <div className="file-tree">
      <h3 style={{ marginBottom: '1rem', color: 'white' }}>Files</h3>
      {files.map(file => renderFileItem(file))}
    </div>
  );
};

export default FileTree;