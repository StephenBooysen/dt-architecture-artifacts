const fs = require('fs-extra');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * ClaudeAI - A plugin for integrating with Claude AI API
 * 
 * This module provides functionality to send text content or files
 * along with prompts to Claude AI and receive intelligent responses.
 */
class ClaudeAI {
  constructor(options = {}) {
    this.options = {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4000,
      temperature: 0.7,
      ...options
    };

    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY || options.apiKey;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable or apiKey option is required');
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * Analyze text content with a given prompt
   * @param {string} content - The text content to analyze
   * @param {string} prompt - The prompt/question to ask about the content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Analysis result with Claude's response
   */
  async analyzeText(content, prompt, options = {}) {
    try {
      if (!content || typeof content !== 'string') {
        throw new Error('Content must be a non-empty string');
      }

      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt must be a non-empty string');
      }

      // Clean the content to remove comments and unnecessary whitespace
      content = await this.cleanText(content);

      const systemMessage = options.systemMessage || 'You are a helpful AI assistant specialized in code and document analysis.';
      const userMessage = `${prompt}\n\nContent to analyze:\n\n${content}`;

      const message = await this.anthropic.messages.create({
        model: options.model || this.options.model,
        max_tokens: options.maxTokens || this.options.maxTokens,
        temperature: options.temperature || this.options.temperature,
        system: systemMessage,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      return {
        success: true,
        response: message.content[0].text,
        model: message.model,
        usage: message.usage,
        inputTokens: message.usage?.input_tokens || 0,
        outputTokens: message.usage?.output_tokens || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Claude AI analysis failed: ${error.message}`);
    }
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
      console.log(`Cleaned: (${(100 - ((text.length / originalLength) * 100)).toFixed(2)}%)`);

      return text;

    } catch (error) {
      console.error(`Error cleaning text from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Analyze a file with a given prompt
   * @param {string} filePath - Path to the file to analyze
   * @param {string} prompt - The prompt/question to ask about the file
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Analysis result with Claude's response
   */
  async analyzeFile(filePath, prompt, options = {}) {
    try {
      // Validate file exists and is readable
      await this.validateFile(filePath);

      // Read file content
      const content = await this.readFileContent(filePath, options);

      // Enhance prompt with file information
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath);
      const enhancedPrompt = `${prompt}\n\nFile: ${fileName} (${fileExtension})`;

      // Analyze with Claude
      const result = await this.analyzeText(content, enhancedPrompt, {
        ...options,
        systemMessage: options.systemMessage || `You are a helpful AI assistant specialized in analyzing files and code. You are currently analyzing a ${fileExtension} file named ${fileName}.`
      });

      return {
        ...result,
        fileName: fileName,
        filePath: filePath,
        fileExtension: fileExtension,
        contentLength: content.length
      };

    } catch (error) {
      throw new Error(`File analysis failed: ${error.message}`);
    }
  }

  /**
   * Architecture analysis - specialized method for code architecture summaries
   * @param {string} contentOrPath - Either text content or file path
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Architecture analysis result
   */
  async analyzeArchitecture(contentOrPath, options = {}) {
    let isFilePath = false;

    if (typeof contentOrPath === 'string' &&
      (contentOrPath.includes('/') || contentOrPath.includes('\\'))) {
      try {
        // Check if path exists using fs.access which is more reliable
        await fs.access(contentOrPath, fs.constants.F_OK);
        isFilePath = true;
      } catch (error) {
        // If file doesn't exist, treat as text content
        isFilePath = false;
      }
    }

    const architectPrompt = "As an architect, please summarize what this file does. Focus on:\n" +
      "1. Main purpose and functionality\n" +
      "2. Key components and classes\n" +
      "3. Dependencies and integrations\n" +
      "4. Architecture patterns used\n" +
      "5. Potential areas for improvement\n" +
      "\nProvide a concise but comprehensive summary suitable for technical documentation.";

    const analysisOptions = {
      ...options,
      systemMessage: "You are a senior software architect with expertise in analyzing code structure, patterns, and architectural decisions. Provide clear, actionable insights.",
      model: options.model || 'claude-3-5-sonnet-20241022',
      maxTokens: options.maxTokens || 2000
    };

    if (isFilePath) {
      return await this.analyzeFile(contentOrPath, architectPrompt, analysisOptions);
    } else {
      return await this.analyzeText(contentOrPath, architectPrompt, analysisOptions);
    }
  }

  /**
   * Validate file exists and is readable
   * @private
   */
  async validateFile(filePath) {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      await fs.access(filePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Cannot access file: ${filePath}`);
    }
  }

  /**
   * Read file content with encoding detection
   * @private
   */
  async readFileContent(filePath, options = {}) {
    try {
      const stats = await fs.stat(filePath);
      const maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB default

      if (stats.size > maxFileSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${maxFileSize} bytes)`);
      }

      const encoding = options.encoding || 'utf8';
      const content = await fs.readFile(filePath, encoding);

      if (!content || content.trim().length === 0) {
        throw new Error('File is empty or contains no readable content');
      }

      return content;
    } catch (error) {
      throw new Error(`Failed to read file content: ${error.message}`);
    }
  }

  /**
   * Get available models
   * @returns {Array} List of available Claude models
   */
  getAvailableModels() {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  /**
   * Validate API key and connection
   * @returns {Promise<Object>} Validation result
   */
  async validateConnection() {
    try {
      const testMessage = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Test connection'
          }
        ]
      });

      return {
        success: true,
        connected: true,
        model: testMessage.model,
        message: 'Connection to Claude AI successful'
      };
    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.message,
        message: 'Failed to connect to Claude AI'
      };
    }
  }
}

module.exports = {
  ClaudeAI,

  // Convenience functions
  analyzeText: async (content, prompt, options = {}) => {
    const claude = new ClaudeAI(options);
    return await claude.analyzeText(content, prompt, options);
  },

  analyzeFile: async (filePath, prompt, options = {}) => {
    const claude = new ClaudeAI(options);
    return await claude.analyzeFile(filePath, prompt, options);
  },

  analyzeArchitecture: async (contentOrPath, options = {}) => {
    const claude = new ClaudeAI(options);
    return await claude.analyzeArchitecture(contentOrPath, options);
  },

  validateConnection: async (options = {}) => {
    const claude = new ClaudeAI(options);
    return await claude.validateConnection();
  }
};