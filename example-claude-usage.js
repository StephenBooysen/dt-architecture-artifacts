/**
 * Example usage of the Claude AI plugin
 * 
 * This demonstrates how to use the Claude AI plugin to analyze
 * code files and get architectural insights.
 */

const { ClaudeAI, analyzeArchitecture } = require('./server/plugins/claude-ai');
const path = require('path');

async function demonstrateClaudeUsage() {
  console.log('🤖 Claude AI Plugin Demo\n');
  
  try {
    // Example 1: Analyze text content directly
    console.log('📝 Example 1: Analyzing code text directly');
    const codeContent = `
class UserService {
  constructor(database, logger) {
    this.db = database;
    this.logger = logger;
  }
  
  async createUser(userData) {
    try {
      const user = await this.db.users.create(userData);
      this.logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }
  
  async getUserById(id) {
    return await this.db.users.findById(id);
  }
}
`;
    
    const textResult = await analyzeArchitecture(codeContent);
    console.log('✅ Analysis Result:');
    console.log(textResult.response);
    console.log('📊 Tokens used:', textResult.inputTokens + textResult.outputTokens);
    console.log('');
    
    // Example 2: Analyze a file
    console.log('📁 Example 2: Analyzing a plugin file');
    const pluginPath = path.join(__dirname, 'server/plugins/docx-to-md/index.js');
    
    const fileResult = await analyzeArchitecture(pluginPath);
    console.log('✅ File Analysis Result:');
    console.log('📄 File:', fileResult.fileName);
    console.log('📝 Summary:', fileResult.response.substring(0, 200) + '...');
    console.log('📊 Tokens used:', fileResult.inputTokens + fileResult.outputTokens);
    console.log('');
    
    // Example 3: Custom analysis with specific prompt
    console.log('🎯 Example 3: Custom analysis with specific prompt');
    const claude = new ClaudeAI();
    
    const customResult = await claude.analyzeFile(
      pluginPath,
      'Please identify any potential security vulnerabilities or areas for improvement in this code.',
      {
        systemMessage: 'You are a security-focused code reviewer with expertise in Node.js applications.',
        maxTokens: 1000
      }
    );
    
    console.log('✅ Security Analysis Result:');
    console.log(customResult.response.substring(0, 300) + '...');
    console.log('');
    
    // Example 4: Connection validation
    console.log('🔌 Example 4: Validating connection');
    const connectionResult = await claude.validateConnection();
    console.log('Connection status:', connectionResult.connected ? '✅ Connected' : '❌ Failed');
    
    console.log('\n🎉 Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    
    if (error.message.includes('ANTHROPIC_API_KEY')) {
      console.log('\n💡 To run this demo with real Claude AI responses:');
      console.log('1. Get an API key from https://console.anthropic.com/');
      console.log('2. Set the environment variable: export ANTHROPIC_API_KEY=your_key_here');
      console.log('3. Run this script again');
    }
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateClaudeUsage();
}

module.exports = { demonstrateClaudeUsage };