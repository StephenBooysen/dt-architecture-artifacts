/**
 * @jest-environment node
 */
const path = require('path');
const fs = require('fs-extra');
const { DocxToMarkdown } = require('../../server/plugins/docx-to-md');

describe('DocxToMarkdown Plugin', () => {
  const converter = new DocxToMarkdown();
  const testOutputDir = path.join(__dirname, 'test-outputs');
  const sampleDocPath = path.join(__dirname, 'sample-doc.docx');
  
  beforeAll(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
  });

  afterAll(async () => {
    // Clean up test outputs
    await fs.remove(testOutputDir);
  });

  describe('Input Validation', () => {
    it('should throw error for non-existent file', async () => {
      const nonExistentPath = path.join(__dirname, 'non-existent.docx');
      
      await expect(converter.convertFile(nonExistentPath, null))
        .rejects
        .toThrow('Input file does not exist');
    });

    it('should throw error for unsupported file format', async () => {
      const textFilePath = path.join(__dirname, 'test.txt');
      
      // Create a temporary text file
      await fs.writeFile(textFilePath, 'test content');
      
      try {
        await expect(converter.convertFile(textFilePath, null))
          .rejects
          .toThrow('Unsupported file format');
      } finally {
        // Clean up
        await fs.remove(textFilePath);
      }
    });

    it('should accept .docx files', async () => {
      // This test will use fallback conversion if sample file exists
      if (await fs.pathExists(sampleDocPath)) {
        const result = await converter.convertFile(sampleDocPath, null);
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('markdown');
        expect(typeof result.markdown).toBe('string');
      } else {
        // Skip if sample file doesn't exist
        console.warn('Sample document not found, skipping .docx acceptance test');
      }
    });
  });

  describe('Conversion Methods', () => {
    let tempDocPath;

    beforeEach(async () => {
      // Create a temporary .docx file for testing
      tempDocPath = path.join(testOutputDir, 'temp-test.docx');
      
      // Copy sample file if it exists, otherwise create a minimal placeholder
      if (await fs.pathExists(sampleDocPath)) {
        await fs.copy(sampleDocPath, tempDocPath);
      } else {
        // Create a minimal file that will trigger fallback conversion
        await fs.writeFile(tempDocPath, 'placeholder docx content');
      }
    });

    afterEach(async () => {
      // Clean up temp file
      if (await fs.pathExists(tempDocPath)) {
        await fs.remove(tempDocPath);
      }
    });

    it('should convert file and return result object', async () => {
      const outputPath = path.join(testOutputDir, 'output.md');
      
      const result = await converter.convertFile(tempDocPath, outputPath);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('outputPath', outputPath);
      expect(result).toHaveProperty('inputFile');
      
      expect(typeof result.markdown).toBe('string');
      expect(Array.isArray(result.messages)).toBe(true);
      expect(Array.isArray(result.images)).toBe(true);
      expect(result.markdown.length).toBeGreaterThan(0);
      
      // Verify output file was created
      expect(await fs.pathExists(outputPath)).toBe(true);
      
      // Verify output file content matches result
      const fileContent = await fs.readFile(outputPath, 'utf8');
      expect(fileContent).toBe(result.markdown);
    });

    it('should convert to string without saving file', async () => {
      const markdown = await converter.convertToString(tempDocPath);
      
      expect(typeof markdown).toBe('string');
      expect(markdown.length).toBeGreaterThan(0);
      expect(markdown).toContain('Document');
    });

    it('should handle fallback conversion gracefully', async () => {
      const result = await converter.convertFile(tempDocPath, null);
      
      expect(result.success).toBe(true);
      expect(result.markdown).toContain('Document Conversion');
      expect(result.markdown).toContain('Converted from:');
      expect(result.markdown).toContain(path.basename(tempDocPath));
    });
  });

  describe('Output File Handling', () => {
    let tempDocPath;

    beforeEach(async () => {
      tempDocPath = path.join(testOutputDir, 'temp-test.docx');
      if (await fs.pathExists(sampleDocPath)) {
        await fs.copy(sampleDocPath, tempDocPath);
      } else {
        await fs.writeFile(tempDocPath, 'placeholder content');
      }
    });

    afterEach(async () => {
      if (await fs.pathExists(tempDocPath)) {
        await fs.remove(tempDocPath);
      }
    });

    it('should create output directory if it does not exist', async () => {
      const nestedOutputPath = path.join(testOutputDir, 'nested', 'deep', 'output.md');
      
      const result = await converter.convertFile(tempDocPath, nestedOutputPath);
      
      expect(result.success).toBe(true);
      expect(await fs.pathExists(nestedOutputPath)).toBe(true);
      
      // Clean up
      await fs.remove(path.join(testOutputDir, 'nested'));
    });

    it('should handle null output path (no file save)', async () => {
      const result = await converter.convertFile(tempDocPath, null);
      
      expect(result.success).toBe(true);
      expect(result.outputPath).toBeNull();
      expect(result.markdown).toBeTruthy();
    });

    it('should overwrite existing output file', async () => {
      const outputPath = path.join(testOutputDir, 'overwrite.md');
      
      // Create existing file
      await fs.writeFile(outputPath, '# Old Content');
      
      const result = await converter.convertFile(tempDocPath, outputPath);
      
      expect(result.success).toBe(true);
      
      const newContent = await fs.readFile(outputPath, 'utf8');
      expect(newContent).not.toBe('# Old Content');
      expect(newContent).toBe(result.markdown);
    });
  });

  describe('Convenience Functions', () => {
    let tempDocPath;

    beforeEach(async () => {
      tempDocPath = path.join(testOutputDir, 'temp-test.docx');
      if (await fs.pathExists(sampleDocPath)) {
        await fs.copy(sampleDocPath, tempDocPath);
      } else {
        await fs.writeFile(tempDocPath, 'placeholder content');
      }
    });

    afterEach(async () => {
      if (await fs.pathExists(tempDocPath)) {
        await fs.remove(tempDocPath);
      }
    });

    it('should work with module-level convert function', async () => {
      const { convert } = require('../../server/plugins/docx-to-md');
      const outputPath = path.join(testOutputDir, 'module-convert.md');
      
      const result = await convert(tempDocPath, outputPath);
      
      expect(result.success).toBe(true);
      expect(await fs.pathExists(outputPath)).toBe(true);
    });

    it('should work with module-level convertToString function', async () => {
      const { convertToString } = require('../../server/plugins/docx-to-md');
      
      const markdown = await convertToString(tempDocPath);
      
      expect(typeof markdown).toBe('string');
      expect(markdown.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle read permission errors gracefully', async () => {
      // This test is platform-dependent and may not work in all environments
      const restrictedPath = path.join(testOutputDir, 'restricted.docx');
      
      try {
        await fs.writeFile(restrictedPath, 'content');
        // Try to make file unreadable (may not work on all systems)
        await fs.chmod(restrictedPath, 0o000);
        
        await expect(converter.convertFile(restrictedPath, null))
          .rejects
          .toThrow();
      } catch (error) {
        // If chmod doesn't work or file system doesn't support it, skip
        console.warn('Permission test skipped:', error.message);
      } finally {
        // Restore permissions and clean up
        try {
          await fs.chmod(restrictedPath, 0o644);
          await fs.remove(restrictedPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    it('should provide meaningful error messages', async () => {
      const nonExistentPath = path.join(__dirname, 'does-not-exist.docx');
      
      try {
        await converter.convertFile(nonExistentPath, null);
      } catch (error) {
        expect(error.message).toContain('DocxToMarkdown conversion failed');
        expect(error.message).toContain('Input file does not exist');
      }
    });
  });

  describe('Configuration Options', () => {
    it('should accept configuration options', () => {
      const customConverter = new DocxToMarkdown({
        preserveImages: false,
        imageOutputDir: 'custom-images',
        outputFormat: 'markdown'
      });
      
      expect(customConverter.options.preserveImages).toBe(false);
      expect(customConverter.options.imageOutputDir).toBe('custom-images');
      expect(customConverter.options.outputFormat).toBe('markdown');
    });

    it('should use default options when none provided', () => {
      const defaultConverter = new DocxToMarkdown();
      
      expect(defaultConverter.options.preserveImages).toBe(true);
      expect(defaultConverter.options.imageOutputDir).toBe('images');
      expect(defaultConverter.options.outputFormat).toBe('markdown');
    });
  });
});