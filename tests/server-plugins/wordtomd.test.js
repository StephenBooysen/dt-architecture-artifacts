
const path = require('path');
const fs = require('fs-extra');
const { WordToMarkdownConverter } = require('../../server/plugins/wordtomd');

describe('WordToMarkdownConverter', () => {
  const converter = new WordToMarkdownConverter();
  const inputPath = path.join(__dirname, 'test.docx');
  const outputPath = path.join(__dirname, 'test.md');

  afterEach(async () => {
    await fs.remove(outputPath);
  });

  it('should convert a .docx file to markdown', async () => {
    const result = await converter.convertFile(inputPath, outputPath);
    expect(result.markdown).toContain('This is a test document.');
        const markdownExists = fs.existsSync(outputPath);
    expect(markdownExists).toBe(true);
  });

  it('should convert a .docx file to a markdown string', async () => {
    const markdown = await converter.convertToString(inputPath);
    expect(markdown).toContain('This is a test document.');
  });
});
