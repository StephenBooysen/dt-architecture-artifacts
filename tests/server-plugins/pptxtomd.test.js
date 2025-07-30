
const path = require('path');
const fs = require('fs-extra');
const { PptxToMarkdownConverter } = require('../../../server/plugins/pptxtomd');
const PPTX = require('node-pptx');

jest.mock('node-pptx', () => {
  return {
    Presentation: jest.fn().mockImplementation(() => {
      return {
        load: jest.fn().mockResolvedValue(null),
        slides: [
          {
            objects: [
              { type: 'text', text: 'Slide 1, Object 1' },
              { type: 'text', text: 'Slide 1, Object 2' },
            ]
          },
          {
            objects: [
              { type: 'text', text: 'Slide 2, Object 1' },
            ]
          }
        ]
      };
    })
  };
});

describe('PptxToMarkdownConverter', () => {
  const converter = new PptxToMarkdownConverter();
  const inputPath = path.join(__dirname, 'test.pptx');
  const outputPath = path.join(__dirname, 'test.md');

  afterEach(async () => {
    await fs.remove(outputPath);
  });

  it('should convert a .pptx file to markdown', async () => {
    const result = await converter.convertFile(inputPath, outputPath);
    expect(result.markdown).toContain('Slide 1, Object 1');
    expect(result.markdown).toContain('Slide 1, Object 2');
    expect(result.markdown).toContain('Slide 2, Object 1');
        const markdownExists = fs.existsSync(outputPath);
    expect(markdownExists).toBe(true);
  });

  it('should convert a .pptx file to a markdown string', async () => {
    const markdown = await converter.convertToString(inputPath);
    expect(markdown).toContain('Slide 1, Object 1');
    expect(markdown).toContain('Slide 1, Object 2');
    expect(markdown).toContain('Slide 2, Object 1');
  });
});
