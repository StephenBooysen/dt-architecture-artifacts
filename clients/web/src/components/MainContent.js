/**
 * @fileoverview Main content area component with routing.
 * Handles different views and route-based content rendering.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import FolderContentView from './FolderContentView';
import MarkdownEditor from './MarkdownEditor';
import TemplatesList from './TemplatesList';
import RecentFilesView from './RecentFilesView';
import StarredFilesView from './StarredFilesView';
import SearchResultsView from './SearchResultsView';
import HomeView from './HomeView';
import UserSettings from './UserSettings';
import NewMarkdownForm from './NewMarkdownForm';
import KnowledgeContentPane from './KnowledgeContentPane';
import { constructSpaceURL } from '../utils/urlUtils';

/**
 * MainContent component that handles all routing and view rendering
 */
function MainContent({
  // Auth state
  isAuthenticated,
  user,
  onAuthUpdate,
  
  // UI state
  currentView,
  setCurrentView,
  isKnowledgeView,
  knowledgeViewContent,
  knowledgeViewSelectedFile,
  isCurrentSpaceReadonly,
  
  // File state
  files,
  urlInfo,
  currentSpace,
  
  // File operations
  onFileSelect,
  
  // Content state
  fileContent,
  selectedFile,
  isFileLoading,
  fileData,
  hasChanges,
  isEditingTemplate,
  onContentChange,
  onSave,
  onRenameItem,
  onCancelTemplateEdit,
  
  // Template operations
  templates,
  isTemplatesLoading,
  onTemplateEdit,
  onTemplateCreate,
  onTemplateDelete,
  onTemplateSelect,
  
  // File management
  onCreateFile,
  
  // Search
  searchResults,
  fileSuggestions,
  searchQuery,
  isLoading,
  onClearSearch
}) {
  return (
    <section className="editor-section">
      <Routes>
        <Route path="/" element={
          isAuthenticated ? 
            currentSpace ? <Navigate to={constructSpaceURL(currentSpace)} replace /> : <div>Loading...</div>
            : null
        } />
        
        <Route path="/:space" element={
          isKnowledgeView ? (
            <KnowledgeContentPane
              content={knowledgeViewContent}
              selectedFile={knowledgeViewSelectedFile}
              isLoading={isLoading}
            />
          ) : currentView === 'home' ? (
            <HomeView
              onFileSelect={(filePath) => onFileSelect(filePath, false)}
              onTemplateSelect={onTemplateSelect}
              onNewMarkdown={() => setCurrentView('new-markdown')}
              isVisible={currentView === 'home'}
              isReadonly={isCurrentSpaceReadonly}
              currentSpace={currentSpace}
            />
          ) : currentView === 'templates' ? (
            <TemplatesList
              templates={templates}
              onTemplateEdit={onTemplateEdit}
              onTemplateCreate={onTemplateCreate}
              onTemplateDelete={onTemplateDelete}
              onTemplateSelect={onTemplateSelect}
              isLoading={isTemplatesLoading}
            />
          ) : currentView === 'recent' ? (
            <RecentFilesView
              onFileSelect={(filePath) => onFileSelect(filePath, true)}
              isVisible={currentView === 'recent'}
            />
          ) : currentView === 'starred' ? (
            <StarredFilesView
              onFileSelect={(filePath) => onFileSelect(filePath, true)}
              isVisible={currentView === 'starred'}
            />
          ) : currentView === 'search' ? (
            <SearchResultsView
              onFileSelect={(filePath) => onFileSelect(filePath, true)}
              searchResults={searchResults}
              fileSuggestions={fileSuggestions}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onClearSearch={onClearSearch}
            />
          ) : currentView === 'settings' ? (
            <UserSettings
              user={user}
              onSettingsUpdate={onAuthUpdate}
              onCancel={() => setCurrentView('home')}
            />
          ) : currentView === 'new-markdown' ? (
            <NewMarkdownForm
              currentSpace={currentSpace}
              onCreateFile={onCreateFile}
              onCancel={() => setCurrentView('home')}
            />
          ) : null
        } />
        
        <Route path="/:space/*" element={
          urlInfo.type === 'folder' ? (
            <FolderContentView
              files={files}
              folderPath={urlInfo.folderPath}
              currentSpace={currentSpace}
              onFileSelect={(filePath) => onFileSelect(filePath, false)}
              isLoading={isLoading}
            />
          ) : urlInfo.type === 'file' ? (
            <MarkdownEditor
              content={fileContent}
              onChange={onContentChange}
              fileName={selectedFile}
              isLoading={isFileLoading}
              onRename={onRenameItem}
              fileData={fileData}
              onSave={onSave}
              hasChanges={hasChanges}
              currentSpace={currentSpace}
              isEditingTemplate={isEditingTemplate}
              onCancelTemplateEdit={onCancelTemplateEdit}
            />
          ) : null
        } />
      </Routes>
    </section>
  );
}

export default MainContent;