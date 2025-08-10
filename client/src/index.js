/**
 * @fileoverview Main application entry point for Architecture Artifacts Editor.
 * 
 * This file bootstraps the React application and sets up the routing configuration.
 * It defines the main application routes including the primary editor interface
 * and the standalone preview window for markdown content.
 * 
 * Routes:
 * - "/" - Main application interface with file tree and editor
 * - "/preview" - Standalone preview window for markdown content
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import PreviewWindow from './components/PreviewWindow';
import './App.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/preview" element={<PreviewWindow />} />
      </Routes>
    </Router>
  </React.StrictMode>
);