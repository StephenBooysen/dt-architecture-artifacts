/**
 * @fileoverview Ollama AI integration plugin for Architecture Artifacts.
 * 
 * This plugin provides an interface to interact with local Ollama AI models
 * for text and file analysis. It supports various AI operations including
 * content analysis, summarization, and other natural language processing tasks.
 * 
 * Key features:
 * - Text analysis using local Ollama models
 * - File content analysis with automatic reading
 * - Configurable AI model selection
 * - Streaming and non-streaming response support
 * 
 * @author Design Artifacts Team
 * @version 1.0.0
 * @since 2024-01-01
 */

const axios = require('axios');
const fs = require('fs').promises;

/**
 * Ollama AI client class for interacting with local Ollama server.
 * 
 * This class provides methods to analyze text and files using Ollama AI models.
 * It handles communication with the local Ollama server running on port 11434.
 */
class OllamaAI {
  /**
   * Creates a new OllamaAI instance.
   * 
   * @param {string} model - The name of the Ollama model to use (e.g., 'llama2', 'codellama').
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Analyzes the provided text using the configured AI model.
   * 
   * Sends a prompt and text to the Ollama server for analysis and returns
   * the AI-generated response. This method is useful for content analysis,
   * summarization, and other text processing tasks.
   * 
   * @param {string} prompt - The instruction prompt for the AI model.
   * @param {string} text - The text content to analyze.
   * @return {Promise<string>} The AI-generated response text.
   * @throws {Error} When the Ollama server is unavailable or returns an error.
   */
  async analyzeText(prompt, text) {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: this.model,
      prompt: await this.cleanText(`${prompt}\n\n${text}`),
      stream: false,
    });

    return response.data.response;
  }

  /**
   * Analyzes a file's content using the configured AI model.
   * 
   * Reads the file content from the specified path and then performs
   * text analysis using the analyzeText method. This is a convenience
   * method for file-based analysis workflows.
   * 
   * @param {string} prompt - The instruction prompt for the AI model.
   * @param {string} filePath - The path to the file to analyze.
   * @return {Promise<string>} The AI-generated response text.
   * @throws {Error} When the file cannot be read or Ollama server is unavailable.
   */
  async analyzeFile(prompt, filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return this.analyzeText(prompt, fileContent);
  }

  /**
   * Cleans the provided code by removing comments and unnecessary whitespace.
   * This method is useful for preparing code snippets for analysis
   * or display by removing single-line and multi-line comments,
   * as well as excessive whitespace.
   * @param {string} code - The code content to clean.
   * @return {Promise<string>} The cleaned code content.
   * @throws {Error} When an error occurs during the cleaning process.
   */
  async cleanText(text) {
    try {

      var originalLength = text.length;

      // Remove single-line comments (//)
      text = text.replace(/\/\/.*$/gm, '');

      // Remove multi-line comments (/* ... */)
      text = text.replace(/\/\*[\s\S]*?\*\//g, '');

      // Remove leading/trailing whitespace on each line
      text = text.replace(/^\s+|\s+$/gm, '');


      // Replace multiple spaces/tabs with a single space
      text = text.replace(/[ \t]+/g, ' ');

      // Remove empty lines
      text = text.replace(/^\s*[\r\n]/gm, '');

      // calculate file size reduction
      console.log(`Cleaned: (${(100-((text.length / originalLength) * 100)).toFixed(2)}%)`);

      return text;

    } catch (error) {
      console.error(`Error cleaning text from ${filePath}:`, error);
      return null;
    }
  }
}

module.exports = OllamaAI;
