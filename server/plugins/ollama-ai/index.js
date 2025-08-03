const axios = require('axios');
const fs = require('fs').promises;

class OllamaAI {
  constructor(model) {
    this.model = model;
  }

  async analyzeText(prompt, text) {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: this.model,
      prompt: `${prompt}\n\n${text}`,
      stream: false,
    });

    return response.data.response;
  }

  async analyzeFile(prompt, filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return this.analyzeText(prompt, fileContent);
  }
}

module.exports = OllamaAI;
