
const OllamaAI = require('../../server/plugins/ollama-ai');
const path = require('path');

async function runAnalysis() {
  try {
    const model = 'tinyllama:latest'; // Or any other model you have
    const ollama = new OllamaAI(model);

    const prompt = "As an architect, please summarize what this file does. Focus on:\n" +
      "1. Main purpose and functionality\n" +
      "2. Key components and classes\n" +
      "3. Dependencies and integrations\n" +
      "4. Architecture patterns used\n" +
      "5. Potential areas for improvement\n" +
      "\nProvide a concise but comprehensive summary suitable for technical documentation.";

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
