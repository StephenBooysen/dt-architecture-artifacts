import { detectFileType, getFileIcon } from '../client/src/utils/fileTypeDetector';

describe('File Type Detector Utility', () => {
  describe('detectFileType', () => {
    test('should detect markdown files', () => {
      expect(detectFileType('README.md')).toBe('markdown');
      expect(detectFileType('document.markdown')).toBe('markdown');
    });

    test('should detect image files', () => {
      expect(detectFileType('photo.jpg')).toBe('image');
      expect(detectFileType('image.jpeg')).toBe('image');
      expect(detectFileType('graphic.png')).toBe('image');
      expect(detectFileType('animation.gif')).toBe('image');
      expect(detectFileType('bitmap.bmp')).toBe('image');
      expect(detectFileType('modern.webp')).toBe('image');
      expect(detectFileType('vector.svg')).toBe('image');
    });

    test('should detect PDF files', () => {
      expect(detectFileType('document.pdf')).toBe('pdf');
      expect(detectFileType('report.PDF')).toBe('pdf');
    });

    test('should detect text files', () => {
      expect(detectFileType('notes.txt')).toBe('text');
      expect(detectFileType('data.json')).toBe('text');
      expect(detectFileType('config.xml')).toBe('text');
      expect(detectFileType('data.csv')).toBe('text');
      expect(detectFileType('debug.log')).toBe('text');
      expect(detectFileType('script.js')).toBe('text');
      expect(detectFileType('types.ts')).toBe('text');
      expect(detectFileType('styles.css')).toBe('text');
      expect(detectFileType('page.html')).toBe('text');
    });

    test('should handle unknown file types', () => {
      expect(detectFileType('unknown.xyz')).toBe('unknown');
      expect(detectFileType('file-without-extension')).toBe('unknown');
    });

    test('should be case insensitive', () => {
      expect(detectFileType('IMAGE.JPG')).toBe('image');
      expect(detectFileType('Document.PDF')).toBe('pdf');
      expect(detectFileType('README.MD')).toBe('markdown');
    });

    test('should handle files with multiple dots', () => {
      expect(detectFileType('file.backup.md')).toBe('markdown');
      expect(detectFileType('config.prod.json')).toBe('text');
    });

    test('should handle empty or null inputs', () => {
      expect(detectFileType('')).toBe('unknown');
      expect(detectFileType(null)).toBe('unknown');
      expect(detectFileType(undefined)).toBe('unknown');
    });
  });

  describe('getFileIcon', () => {
    test('should return correct icons for markdown files', () => {
      expect(getFileIcon('markdown')).toBe('📝');
    });

    test('should return correct icons for image files', () => {
      expect(getFileIcon('image')).toBe('🖼️');
    });

    test('should return correct icons for PDF files', () => {
      expect(getFileIcon('pdf')).toBe('📄');
    });

    test('should return correct icons for text files', () => {
      expect(getFileIcon('text')).toBe('📄');
    });

    test('should return default icon for unknown files', () => {
      expect(getFileIcon('unknown')).toBe('📄');
      expect(getFileIcon('binary')).toBe('📄');
    });

    test('should handle null or undefined file types', () => {
      expect(getFileIcon(null)).toBe('📄');
      expect(getFileIcon(undefined)).toBe('📄');
    });
  });

  describe('Integration tests', () => {
    test('should work together for complete file type detection and icon display', () => {
      const testCases = [
        { filename: 'README.md', expectedType: 'markdown', expectedIcon: '📝' },
        { filename: 'photo.jpg', expectedType: 'image', expectedIcon: '🖼️' },
        { filename: 'document.pdf', expectedType: 'pdf', expectedIcon: '📄' },
        { filename: 'config.json', expectedType: 'text', expectedIcon: '📄' },
        { filename: 'unknown.xyz', expectedType: 'unknown', expectedIcon: '📄' }
      ];

      testCases.forEach(({ filename, expectedType, expectedIcon }) => {
        const detectedType = detectFileType(filename);
        const icon = getFileIcon(detectedType);
        
        expect(detectedType).toBe(expectedType);
        expect(icon).toBe(expectedIcon);
      });
    });
  });
});