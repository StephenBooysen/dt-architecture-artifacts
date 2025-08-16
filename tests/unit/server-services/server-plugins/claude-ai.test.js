const { ClaudeAI, analyzeText, analyzeFile, analyzeArchitecture, validateConnection } = require('../../server/plugins/claude-ai');
const fs = require('fs-extra');
const path = require('path');

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }));
});

const Anthropic = require('@anthropic-ai/sdk');

describe('ClaudeAI Plugin', () => {
  let mockAnthropicInstance;
  let claudeAI;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock Anthropic instance
    mockAnthropicInstance = {
      messages: {
        create: jest.fn()
      }
    };
    
    Anthropic.mockImplementation(() => mockAnthropicInstance);
    
    // Set up environment variable for testing
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    
    claudeAI = new ClaudeAI();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const claude = new ClaudeAI();
      expect(claude.options.model).toBe('claude-3-5-sonnet-20241022');
      expect(claude.options.maxTokens).toBe(4000);
      expect(claude.options.temperature).toBe(0.7);
    });

    test('should initialize with custom options', () => {
      const options = {
        model: 'claude-3-opus-20240229',
        maxTokens: 2000,
        temperature: 0.5
      };
      const claude = new ClaudeAI(options);
      expect(claude.options.model).toBe('claude-3-opus-20240229');
      expect(claude.options.maxTokens).toBe(2000);
      expect(claude.options.temperature).toBe(0.5);
    });

    test('should throw error if no API key provided', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new ClaudeAI()).toThrow('ANTHROPIC_API_KEY environment variable or apiKey option is required');
    });

    test('should use apiKey from options', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new ClaudeAI({ apiKey: 'test-key' })).not.toThrow();
    });
  });

  describe('analyzeText', () => {
    beforeEach(() => {
      mockAnthropicInstance.messages.create.mockResolvedValue({
        content: [{ text: 'This is a test response from Claude' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          input_tokens: 50,
          output_tokens: 25
        }
      });
    });

    test('should analyze text successfully', async () => {
      const content = 'function test() { return "hello"; }';
      const prompt = 'What does this function do?';
      
      const result = await claudeAI.analyzeText(content, prompt);
      
      expect(result.success).toBe(true);
      expect(result.response).toBe('This is a test response from Claude');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
      expect(result.inputTokens).toBe(50);
      expect(result.outputTokens).toBe(25);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should throw error for empty content', async () => {
      await expect(claudeAI.analyzeText('', 'test prompt')).rejects.toThrow('Content must be a non-empty string');
    });

    test('should throw error for empty prompt', async () => {
      await expect(claudeAI.analyzeText('test content', '')).rejects.toThrow('Prompt must be a non-empty string');
    });

    test('should handle API errors', async () => {
      mockAnthropicInstance.messages.create.mockRejectedValue(new Error('API Error'));
      
      await expect(claudeAI.analyzeText('content', 'prompt')).rejects.toThrow('Claude AI analysis failed: API Error');
    });

    test('should use custom options', async () => {
      const options = {
        model: 'claude-3-opus-20240229',
        maxTokens: 1000,
        temperature: 0.2,
        systemMessage: 'Custom system message'
      };
      
      await claudeAI.analyzeText('content', 'prompt', options);
      
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-opus-20240229',
          max_tokens: 1000,
          temperature: 0.2,
          system: 'Custom system message'
        })
      );
    });
  });

  describe('analyzeFile', () => {
    const testFilePath = path.join(__dirname, 'test-file.js');
    const testContent = 'const test = () => console.log("hello");';

    beforeEach(async () => {
      // Create test file
      await fs.writeFile(testFilePath, testContent);
      
      mockAnthropicInstance.messages.create.mockResolvedValue({
        content: [{ text: 'File analysis response' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      });
    });

    afterEach(async () => {
      // Clean up test file
      if (await fs.pathExists(testFilePath)) {
        await fs.remove(testFilePath);
      }
    });

    test('should analyze file successfully', async () => {
      const prompt = 'Analyze this code';
      
      const result = await claudeAI.analyzeFile(testFilePath, prompt);
      
      expect(result.success).toBe(true);
      expect(result.response).toBe('File analysis response');
      expect(result.fileName).toBe('test-file.js');
      expect(result.filePath).toBe(testFilePath);
      expect(result.fileExtension).toBe('.js');
      expect(result.contentLength).toBe(testContent.length);
    });

    test('should throw error for non-existent file', async () => {
      const nonExistentFile = path.join(__dirname, 'non-existent.js');
      
      await expect(claudeAI.analyzeFile(nonExistentFile, 'prompt')).rejects.toThrow('Cannot access file');
    });

    test('should throw error for empty file', async () => {
      const emptyFilePath = path.join(__dirname, 'empty-file.js');
      await fs.writeFile(emptyFilePath, '');
      
      try {
        await expect(claudeAI.analyzeFile(emptyFilePath, 'prompt')).rejects.toThrow('File is empty or contains no readable content');
      } finally {
        await fs.remove(emptyFilePath);
      }
    });

    test('should handle file size limit', async () => {
      const largeContent = 'a'.repeat(2000);
      const largeFilePath = path.join(__dirname, 'large-file.js');
      await fs.writeFile(largeFilePath, largeContent);
      
      try {
        await expect(claudeAI.analyzeFile(largeFilePath, 'prompt', { maxFileSize: 1000 }))
          .rejects.toThrow('File too large');
      } finally {
        await fs.remove(largeFilePath);
      }
    });
  });

  describe('analyzeArchitecture', () => {
    beforeEach(() => {
      mockAnthropicInstance.messages.create.mockResolvedValue({
        content: [{ text: 'Architecture analysis response' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          input_tokens: 200,
          output_tokens: 150
        }
      });
    });

    test('should analyze text content as architecture', async () => {
      const content = 'class MyService { constructor() {} process() {} }';
      
      const result = await claudeAI.analyzeArchitecture(content);
      
      expect(result.success).toBe(true);
      expect(result.response).toBe('Architecture analysis response');
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('senior software architect'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('As an architect, please summarize')
            })
          ])
        })
      );
    });

    test('should analyze file as architecture when valid path provided', async () => {
      const testFilePath = path.join(__dirname, 'arch-test.js');
      await fs.writeFile(testFilePath, 'class Test {}');
      
      try {
        // Mock fs.pathExists to return true for our test file
        jest.spyOn(fs, 'pathExists').mockResolvedValue(true);
        
        const result = await claudeAI.analyzeArchitecture(testFilePath);
        
        expect(result.success).toBe(true);
        expect(result.fileName).toBe('arch-test.js');
      } finally {
        await fs.remove(testFilePath);
        jest.restoreAllMocks();
      }
    });
  });

  describe('validateConnection', () => {
    test('should validate connection successfully', async () => {
      mockAnthropicInstance.messages.create.mockResolvedValue({
        model: 'claude-3-5-haiku-20241022'
      });
      
      const result = await claudeAI.validateConnection();
      
      expect(result.success).toBe(true);
      expect(result.connected).toBe(true);
      expect(result.model).toBe('claude-3-5-haiku-20241022');
    });

    test('should handle connection failure', async () => {
      mockAnthropicInstance.messages.create.mockRejectedValue(new Error('Connection failed'));
      
      const result = await claudeAI.validateConnection();
      
      expect(result.success).toBe(false);
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('getAvailableModels', () => {
    test('should return list of available models', () => {
      const models = claudeAI.getAvailableModels();
      
      expect(Array.isArray(models)).toBe(true);
      expect(models).toContain('claude-3-5-sonnet-20241022');
      expect(models).toContain('claude-3-5-haiku-20241022');
      expect(models).toContain('claude-3-opus-20240229');
    });
  });

  describe('Convenience Functions', () => {
    beforeEach(() => {
      mockAnthropicInstance.messages.create.mockResolvedValue({
        content: [{ text: 'Convenience function response' }],
        model: 'claude-3-5-sonnet-20241022',
        usage: { input_tokens: 10, output_tokens: 5 }
      });
    });

    test('analyzeText convenience function should work', async () => {
      const result = await analyzeText('content', 'prompt');
      expect(result.success).toBe(true);
      expect(result.response).toBe('Convenience function response');
    });

    test('analyzeArchitecture convenience function should work', async () => {
      const result = await analyzeArchitecture('class Test {}');
      expect(result.success).toBe(true);
      expect(result.response).toBe('Convenience function response');
    });

    test('validateConnection convenience function should work', async () => {
      const result = await validateConnection();
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-string content gracefully', async () => {
      await expect(claudeAI.analyzeText(123, 'prompt')).rejects.toThrow('Content must be a non-empty string');
      await expect(claudeAI.analyzeText(null, 'prompt')).rejects.toThrow('Content must be a non-empty string');
      await expect(claudeAI.analyzeText(undefined, 'prompt')).rejects.toThrow('Content must be a non-empty string');
    });

    test('should handle non-string prompt gracefully', async () => {
      await expect(claudeAI.analyzeText('content', 123)).rejects.toThrow('Prompt must be a non-empty string');
      await expect(claudeAI.analyzeText('content', null)).rejects.toThrow('Prompt must be a non-empty string');
      await expect(claudeAI.analyzeText('content', undefined)).rejects.toThrow('Prompt must be a non-empty string');
    });
  });
});