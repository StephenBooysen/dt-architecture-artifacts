const mammoth = require('mammoth');
const fs = require('fs-extra');
const path = require('path');

class WordToMarkdownConverter {
  constructor(options = {}) {
    this.options = {
      preserveImages: true,
      imageOutputDir: 'images',
      ...options
    };
  }

  async convertFile(inputPath, outputPath = null) {
    try {
      if (!await fs.pathExists(inputPath)) {
        throw new Error(`Input file does not exist: ${inputPath}`);
      }

      const fileExtension = path.extname(inputPath).toLowerCase();
      if (!['.docx', '.doc'].includes(fileExtension)) {
        throw new Error('Unsupported file format. Only .docx and .doc files are supported.');
      }

      const buffer = await fs.readFile(inputPath);
      const result = await this.convertBuffer(buffer);

      if (outputPath) {
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, result.markdown);
        
        if (this.options.preserveImages && result.images.length > 0) {
          await this.saveImages(result.images, path.dirname(outputPath));
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }

  async convertBuffer(buffer) {
    const convertOptions = {
      convertImage: this.options.preserveImages ? mammoth.images.imgElement((image) => {
        return image.read("base64").then((imageBuffer) => {
          const extension = image.contentType.split('/')[1] || 'png';
          const filename = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
          return {
            src: `${this.options.imageOutputDir}/${filename}`,
            imageData: imageBuffer,
            filename: filename
          };
        });
      }) : mammoth.images.ignoreAll
    };

    const result = await mammoth.convertToMarkdown(buffer, convertOptions);
    
    const images = [];
    if (this.options.preserveImages) {
      const imageMatches = result.value.match(/!\[.*?\]\((.*?)\)/g) || [];
      imageMatches.forEach(match => {
        const src = match.match(/!\[.*?\]\((.*?)\)/)[1];
        if (src.startsWith(this.options.imageOutputDir)) {
          images.push({
            src: src,
            filename: path.basename(src)
          });
        }
      });
    }

    return {
      markdown: result.value,
      messages: result.messages,
      images: images
    };
  }

  async saveImages(images, outputDir) {
    const imageDir = path.join(outputDir, this.options.imageOutputDir);
    await fs.ensureDir(imageDir);

    for (const image of images) {
      if (image.imageData) {
        const imagePath = path.join(imageDir, image.filename);
        await fs.writeFile(imagePath, image.imageData, 'base64');
      }
    }
  }

  async convertToString(inputPath) {
    const result = await this.convertFile(inputPath);
    return result.markdown;
  }
}

module.exports = {
  WordToMarkdownConverter,
  convert: async (inputPath, outputPath, options = {}) => {
    const converter = new WordToMarkdownConverter(options);
    return await converter.convertFile(inputPath, outputPath);
  },
  convertToString: async (inputPath, options = {}) => {
    const converter = new WordToMarkdownConverter(options);
    return await converter.convertToString(inputPath);
  }
};