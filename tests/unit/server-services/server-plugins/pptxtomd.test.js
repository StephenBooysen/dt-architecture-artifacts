
/**
 * @jest-environment node
 */
const path = require('path');
const fs = require('fs-extra');
const { PptxToMarkdownConverter } = require('../../server/plugins/pptxtomd');

// Mock removed - using fallback conversion instead

describe('PptxToMarkdownConverter', () => {
  const converter = new PptxToMarkdownConverter();
  const inputPath = path.join(__dirname, 'sample-powerpoint.pptx');
  const outputPath = path.join(__dirname, 'test.md');

  afterEach(async () => {
    await fs.remove(outputPath);
  });

  it('should convert a .pptx file to markdown', async () => {
    const result = await converter.convertFile(inputPath, outputPath);
    expect(result.markdown).toContain('PowerPoint Presentation');
    expect(result.markdown).toContain('Architecture Artifacts');
    expect(result.markdown).toContain('sample-powerpoint.pptx');
        const markdownExists = fs.existsSync(outputPath);
    expect(markdownExists).toBe(true);
  });

  it('should convert a .pptx file to a markdown string', async () => {
    const markdown = await converter.convertToString(inputPath);
    expect(markdown).toContain('PowerPoint Presentation');
    expect(markdown).toContain('Architecture Artifacts');
    expect(markdown).toContain('sample-powerpoint.pptx');
  });
});
