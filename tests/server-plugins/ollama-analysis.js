
const OllamaAI = require('../../server/plugins/ollama-ai');
const path = require('path');

async function runAnalysis() {
  try {
    const model = 'tinyllama:latest'; // Or any other model you have
    const ollama = new OllamaAI(model);

    const prompt = 'what does this file do';
    const fileToAnalyze = path.join(__dirname, 'sample-code.js');

    console.log(`Analyzing file: ${fileToAnalyze}`);
    console.log(`With prompt: "${prompt}"`);
    console.log('Please wait...');

    const result = await ollama.analyzeFile(prompt, fileToAnalyze);

    console.log('\n--- Ollama Response ---');
    console.log(result);
    console.log('--- End Response ---\n');

  } catch (error) {
    console.error('An error occurred during analysis:', error);
  }
}

runAnalysis();
