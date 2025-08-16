/**
 * @fileoverview Custom hook for search functionality.
 * Handles search state, suggestions, and result management for both regular and knowledge views.
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { searchFiles, searchContent } from '../services/api';

/**
 * Custom hook for managing search functionality
 */
export function useSearch(currentSpace, isKnowledgeView = false) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  /**
   * Handles search input changes and fetches suggestions
   */
  const handleSearchChange = useCallback(async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setHighlightedIndex(-1);
    
    if (query.trim().length > 0) {
      try {
        // Search both files and content simultaneously
        const [fileSuggestions, contentResults] = await Promise.all([
          searchFiles(query, currentSpace),
          searchContent(query, currentSpace)
        ]);
        
        setSearchSuggestions(fileSuggestions.slice(0, 5)); // Limit to 5 file suggestions
        setSearchResults(contentResults.slice(0, 10)); // Limit to 10 content results
        setShowSearchResults(true);
      } catch (error) {
        console.error('Error fetching search results:', error);
        setSearchSuggestions([]);
        setSearchResults([]);
      }
    } else {
      setSearchSuggestions([]);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [currentSpace]);

  /**
   * Handles search submission for comprehensive results
   */
  const handleSearchSubmit = useCallback(async () => {
    if (searchQuery.trim().length === 0) return;
    
    try {
      // Get more comprehensive results when explicitly searching
      const [fileSuggestions, contentResults] = await Promise.all([
        searchFiles(searchQuery, currentSpace),
        searchContent(searchQuery, currentSpace)
      ]);
      
      setSearchSuggestions(fileSuggestions.slice(0, 10)); // More file results on submit
      setSearchResults(contentResults.slice(0, 20)); // More content results on submit
      setShowSearchResults(false); // Hide dropdown
      
      return { fileSuggestions, contentResults };
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Search failed');
      return null;
    }
  }, [searchQuery, currentSpace]);

  /**
   * Handles knowledge view search submission with deduplication
   */
  const handleKnowledgeSearchSubmit = useCallback(async () => {
    if (searchQuery.trim().length === 0) return;
    
    try {
      // Get search results for knowledge view
      const [fileSuggestions, contentResults] = await Promise.all([
        searchFiles(searchQuery, currentSpace),
        searchContent(searchQuery, currentSpace)
      ]);
      
      // Create a Map to deduplicate by file path
      const resultsMap = new Map();
      
      // Add file suggestions first (these get priority for type: 'file')
      fileSuggestions.forEach(file => {
        resultsMap.set(file.filePath, {
          ...file,
          type: 'file',
          title: file.fileName,
          path: file.filePath
        });
      });
      
      // Add content results, but merge with existing entries if path already exists
      contentResults.forEach(content => {
        const existing = resultsMap.get(content.filePath);
        if (existing) {
          // Merge content info with existing file entry
          resultsMap.set(content.filePath, {
            ...existing,
            type: 'both', // Indicates it has both file match and content match
            preview: content.preview, // Add preview from content search
            ...content // Merge any additional content fields
          });
        } else {
          // New content-only result
          resultsMap.set(content.filePath, {
            ...content,
            type: 'content',
            title: content.fileName,
            path: content.filePath
          });
        }
      });
      
      // Convert Map back to array
      const combinedResults = Array.from(resultsMap.values());
      
      return combinedResults;
    } catch (error) {
      console.error('Error searching in knowledge view:', error);
      toast.error('Search failed');
      return [];
    }
  }, [searchQuery, currentSpace]);

  /**
   * Handles keyboard navigation in search dropdown
   */
  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isKnowledgeView) {
        return handleKnowledgeSearchSubmit();
      } else {
        return handleSearchSubmit();
      }
    } else if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSearchQuery('');
      setSearchSuggestions([]);
      setSearchResults([]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev < searchSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => prev > 0 ? prev - 1 : -1);
    }
  }, [searchSuggestions.length, handleSearchSubmit, handleKnowledgeSearchSubmit, isKnowledgeView]);

  /**
   * Clears all search state
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setSearchResults([]);
    setShowSearchResults(false);
    setHighlightedIndex(-1);
  }, []);

  /**
   * Sets search results externally (for knowledge view)
   */
  const setKnowledgeSearchResults = useCallback((results) => {
    setSearchResults(results);
  }, []);

  return {
    // State
    searchQuery,
    searchSuggestions,
    searchResults,
    showSearchResults,
    highlightedIndex,
    
    // Actions
    handleSearchChange,
    handleSearchSubmit,
    handleKnowledgeSearchSubmit,
    handleSearchKeyDown,
    clearSearch,
    setSearchQuery,
    setSearchSuggestions,
    setSearchResults,
    setShowSearchResults,
    setHighlightedIndex,
    setKnowledgeSearchResults
  };
}