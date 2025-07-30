

const PPTX = require('node-pptx');
const fs = require('fs-extra');
const path = require('path');

class PptxToMarkdownConverter {
  constructor(options = {}) {
    this.options = {
      ...options
    };
  }

  async convertFile(inputPath, outputPath = null) {
    try {
                              try {
        await fs.promises.access(inputPath);
      } catch (e) {
        throw new Error(`Input file does not exist: ${inputPath}`);
      }

      const fileExtension = path.extname(inputPath).toLowerCase();
      if (fileExtension !== '.pptx') {
        throw new Error('Unsupported file format. Only .pptx files are supported.');
      }

      const buffer = await fs.readFile(inputPath);
      const result = await this.convertBuffer(buffer);

      if (outputPath) {
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, result.markdown);
      }

      return result;
    } catch (error) {
            throw error;
    }
  }

  async convertBuffer(buffer) {
    const pptx = new PPTX.Presentation();
    await pptx.load(buffer);

    let markdown = '';
    for (const slide of pptx.slides) {
      for (const object of slide.objects) {
        if (object.type === 'text') {
          markdown += object.text + '\n\n';
        }
      }
      markdown += '---\n\n';
    }

    return {
      markdown: markdown,
      messages: [],
      images: []
    };
  }

  async convertToString(inputPath) {
    const result = await this.convertFile(inputPath);
    return result.markdown;
  }
}

module.exports = {
  PptxToMarkdownConverter,
  convert: async (inputPath, outputPath, options = {}) => {
    const converter = new PptxToMarkdownConverter(options);
    return await converter.convertFile(inputPath, outputPath);
  },
  convertToString: async (inputPath, options = {}) => {
    const converter = new PptxToMarkdownConverter(options);
    return await converter.convertToString(inputPath);
  }
};

