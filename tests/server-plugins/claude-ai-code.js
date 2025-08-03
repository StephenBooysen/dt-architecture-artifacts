const { analyzeArchitecture } = require('../../server/plugins/claude-ai');
const fs = require('fs').promises;
const path = require('path');

async function testClaudeAnalysis() {
  try {
    // Use the full path to the sample-code.js file
    const sampleCodePath = path.resolve('/home/stephen/Code/dt-architecture-artifacts/tests/server-plugins/sample-code.js');
    
    console.log('🤖 Testing Claude AI analysis on sample-code.js');
    console.log('===============================================');
    console.log(`📁 File: ${sampleCodePath}`);
    console.log('📖 Loading file content...');
    
    // Read the file content
    const fileContent = await fs.readFile(sampleCodePath, 'utf8');
    console.log(`📊 File size: ${fileContent.length} characters`);
    console.log('⏳ Analyzing content...\n');
    
    // Pass the content directly instead of the file path
    const result = await analyzeArchitecture(fileContent);
    
    if (result.success) {
      console.log('✅ Analysis completed successfully!');
      console.log(`📊 Model: ${result.model}`);
      console.log(`📝 Content analyzed: ${fileContent.length} characters`);
      console.log(`🔢 Input tokens: ${result.inputTokens}`);
      console.log(`🔢 Output tokens: ${result.outputTokens}`);
      console.log(`⏱️  Timestamp: ${result.timestamp}\n`);
      
      console.log('🏗️ Claude\'s Analysis:');
      console.log('======================');
      console.log(result.response);
      console.log('======================\n');
    } else {
      console.error('❌ Analysis failed');
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    
    if (error.message.includes('ANTHROPIC_API_KEY')) {
      console.log('\n💡 To run this test:');
      console.log('1. Get an API key from https://console.anthropic.com/');
      console.log('2. Set environment variable: export ANTHROPIC_API_KEY=your_key_here');
      console.log('3. Run: node tests/server-plugins/claude-ai-code.js');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testClaudeAnalysis();
}

module.exports = { testClaudeAnalysis };
