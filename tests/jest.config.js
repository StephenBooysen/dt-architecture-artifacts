module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  
  // Module paths
  roots: ['<rootDir>/tests', '<rootDir>/client/src', '<rootDir>/server'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/__tests__/**/*.(js|jsx|ts|tsx)',
    '<rootDir>/tests/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    '^.+\\.css$': 'identity-obj-proxy'
  },
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'client/src/**/*.{js,jsx}',
    'server/**/*.js',
    '!client/src/index.js',
    '!client/src/serviceWorker.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Mock module patterns
  modulePathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/dist/'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test timeout
  testTimeout: 10000
};