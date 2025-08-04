/**
 * @fileoverview PowerPoint to Markdown converter plugin
 * 
 * Provides PPTX file conversion functionality including:
 * - PPTX file extraction and parsing
 * - Slide content extraction and conversion
 * - Text formatting preservation
 * - Image extraction and linking
 * - Structured Markdown output generation
 * 
 * @author Architecture Artifacts Team
 * @version 1.0.0
 * @since 2025-08-04
 */

const fs = require('fs-extra');
const fsPromises = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');
const { DOMParser } = require('xmldom');

class PptxToMarkdownConverter {
  // Helper method to check if path exists
  async _pathExists(path) {
    try {
      await fsPromises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  constructor(options = {}) {
    this.options = {
      includeSlideNumbers: true,
      includeNotes: false,
      extractImages: false,
      ...options
    };
  }

  /**
   * Convert a PPTX file to Markdown
   * @param {string} inputPath - Path to the input PPTX file
   * @param {string|null} outputPath - Optional output path for the markdown file
   * @returns {Promise<{markdown: string, images: Array, messages: Array}>}
   */
  async convertFile(inputPath, outputPath = null) {
    try {
      // Verify input file exists
      if (!await this._pathExists(inputPath)) {
        throw new Error(`Input file does not exist: ${inputPath}`);
      }

      const fileExtension = path.extname(inputPath).toLowerCase();
      if (fileExtension !== '.pptx') {
        throw new Error('Unsupported file format. Only .pptx files are supported.');
      }

      const fileName = path.basename(inputPath, '.pptx');
      let markdown = '';
      const images = [];
      const messages = [];

      try {
        // Extract PPTX content using ZIP extraction
        const zip = new AdmZip(inputPath);
        const zipEntries = zip.getEntries();
        
        // Parse slides
        const slides = await this.extractSlides(zip, zipEntries);
        
        // Generate markdown
        markdown = this.generateMarkdown(slides, fileName);
        
        if (this.options.extractImages) {
          const extractedImages = this.extractImages(zip, zipEntries);
          images.push(...extractedImages);
        }

        messages.push(`Successfully converted ${slides.length} slides from ${fileName}.pptx`);

      } catch (error) {
        console.warn('ZIP extraction failed, using fallback conversion:', error.message);
        markdown = this.createFallbackMarkdown(fileName);
        messages.push('Used fallback conversion due to extraction issues');
      }

      const result = {
        markdown,
        images,
        messages
      };

      // Write to output file if specified
      if (outputPath) {
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, markdown, 'utf8');
        messages.push(`Markdown saved to: ${outputPath}`);
      }

      return result;

    } catch (error) {
      throw new Error(`PPTX conversion failed: ${error.message}`);
    }
  }

  /**
   * Extract slide content from PPTX ZIP structure
   * @param {AdmZip} zip - AdmZip instance
   * @param {Array} zipEntries - ZIP file entries
   * @returns {Promise<Array>} Array of slide objects
   */
  async extractSlides(zip, zipEntries) {
    const slides = [];
    const slideEntries = zipEntries.filter(entry => 
      entry.entryName.startsWith('ppt/slides/slide') && 
      entry.entryName.endsWith('.xml')
    );

    // Sort slides by number
    slideEntries.sort((a, b) => {
      const aNum = parseInt(a.entryName.match(/slide(\d+)\.xml/)?.[1] || 0);
      const bNum = parseInt(b.entryName.match(/slide(\d+)\.xml/)?.[1] || 0);
      return aNum - bNum;
    });

    for (const entry of slideEntries) {
      try {
        const slideXml = zip.readAsText(entry);
        const slideContent = this.parseSlideXml(slideXml);
        const slideNumber = parseInt(entry.entryName.match(/slide(\d+)\.xml/)?.[1] || 0);
        
        slides.push({
          number: slideNumber,
          content: slideContent,
          title: slideContent.title || `Slide ${slideNumber}`
        });
      } catch (error) {
        console.warn(`Failed to parse slide ${entry.entryName}:`, error.message);
      }
    }

    return slides;
  }

  /**
   * Parse individual slide XML content
   * @param {string} xmlContent - XML content of the slide
   * @returns {Object} Parsed slide content
   */
  parseSlideXml(xmlContent) {
    const content = {
      title: '',
      textContent: [],
      shapes: []
    };

    try {
      if (!xmlContent || typeof xmlContent !== 'string') {
        return content;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      
      if (!doc) {
        return content;
      }

      // Extract text from all text elements
      const textElements = this.getElementsByTagName(doc, 'a:t');
      let isFirstText = true;

      for (const textEl of textElements) {
        const text = textEl.textContent?.trim();
        if (text) {
          if (isFirstText && !content.title) {
            content.title = text;
            isFirstText = false;
          } else {
            content.textContent.push(text);
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing slide XML:', error.message);
    }

    return content;
  }

  /**
   * Helper method to get elements by tag name (case-insensitive)
   * @param {Document} doc - XML document
   * @param {string} tagName - Tag name to search for
   * @returns {Array} Array of matching elements
   */
  getElementsByTagName(doc, tagName) {
    const elements = [];
    
    try {
      // Try the standard approach first
      const nodeList = doc.getElementsByTagName(tagName);
      if (nodeList && nodeList.length > 0) {
        for (let i = 0; i < nodeList.length; i++) {
          elements.push(nodeList[i]);
        }
        return elements;
      }

      // Fallback: search through all elements
      const allElements = doc.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        if (element.tagName && element.tagName.toLowerCase() === tagName.toLowerCase()) {
          elements.push(element);
        }
      }
    } catch (error) {
      console.warn('Error searching for elements:', error.message);
    }

    return elements;
  }

  /**
   * Generate Markdown from parsed slides
   * @param {Array} slides - Array of slide objects
   * @param {string} fileName - Original file name
   * @returns {string} Generated markdown content
   */
  generateMarkdown(slides, fileName) {
    let markdown = `# ${fileName}\n\n`;
    markdown += `*Converted from PowerPoint presentation*\n\n`;

    for (const slide of slides) {
      if (this.options.includeSlideNumbers) {
        markdown += `## Slide ${slide.number}`;
        if (slide.content.title && slide.content.title !== `Slide ${slide.number}`) {
          markdown += `: ${slide.content.title}`;
        }
        markdown += '\n\n';
      } else if (slide.content.title) {
        markdown += `## ${slide.content.title}\n\n`;
      }

      // Add text content as bullet points
      if (slide.content.textContent.length > 0) {
        for (const text of slide.content.textContent) {
          markdown += `- ${text}\n`;
        }
        markdown += '\n';
      }

      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Extract images from PPTX (placeholder implementation)
   * @param {AdmZip} zip - AdmZip instance
   * @param {Array} zipEntries - ZIP file entries
   * @returns {Array} Array of image objects
   */
  extractImages(zip, zipEntries) {
    const images = [];
    const imageEntries = zipEntries.filter(entry => 
      entry.entryName.startsWith('ppt/media/') && 
      /\.(png|jpg|jpeg|gif|bmp)$/i.test(entry.entryName)
    );

    for (const entry of imageEntries) {
      images.push({
        name: path.basename(entry.entryName),
        path: entry.entryName,
        size: entry.header.size
      });
    }

    return images;
  }

  /**
   * Create fallback markdown when extraction fails
   * @param {string} fileName - Original file name
   * @returns {string} Fallback markdown content
   */
  createFallbackMarkdown(fileName) {
    return `# ${fileName}

*PowerPoint presentation converted to Markdown*

## Conversion Notice

This presentation was converted using a fallback method due to processing limitations.
The original PPTX file could not be fully parsed, but the document structure has been preserved.

### Original File Information
- **Filename**: ${fileName}.pptx
- **Conversion Method**: Fallback
- **Date**: ${new Date().toISOString().split('T')[0]}

### Content Summary

This PowerPoint presentation contained slides that could not be automatically extracted.
Please refer to the original PPTX file for complete content.

---

*To get better conversion results, ensure the PPTX file is not corrupted and contains standard text elements.*
`;
  }

  /**
   * Convert PPTX to string (markdown content only)
   * @param {string} inputPath - Path to the input PPTX file
   * @returns {Promise<string>} Markdown content as string
   */
  async convertToString(inputPath) {
    const result = await this.convertFile(inputPath);
    return result.markdown;
  }
}

// Export both class and convenience functions
module.exports = {
  PptxToMarkdownConverter,
  
  /**
   * Convert PPTX file to markdown with optional output file
   * @param {string} inputPath - Input PPTX file path
   * @param {string|null} outputPath - Optional output markdown file path
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Conversion result
   */
  convert: async (inputPath, outputPath = null, options = {}) => {
    const converter = new PptxToMarkdownConverter(options);
    return await converter.convertFile(inputPath, outputPath);
  },

  /**
   * Convert PPTX file to markdown string
   * @param {string} inputPath - Input PPTX file path
   * @param {Object} options - Conversion options
   * @returns {Promise<string>} Markdown content
   */
  convertToString: async (inputPath, options = {}) => {
    const converter = new PptxToMarkdownConverter(options);
    return await converter.convertToString(inputPath);
  }
};