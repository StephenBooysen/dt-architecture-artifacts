/**
 * Jest configuration for Architecture Artifacts testing.
 * 
 * This configuration handles both server-side and client-side testing
 * with appropriate environment setup and coverage reporting.
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Root directories for tests
  roots: ['<rootDir>'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/**/__tests__/**/*.(js|jsx|ts|tsx)',
    '<rootDir>/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node'
  ],
  
  // Transform files with Babel
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../$1',
    '^@server/(.*)$': '<rootDir>/../server/$1',
    '^@client/(.*)$': '<rootDir>/../client/src/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '@testing-library/jest-dom'
  ],
  
  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    '<rootDir>/../server/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/../client/src/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/build/**',
    '!**/dist/**'
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
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/../node_modules',
    '<rootDir>/../server/node_modules',
    '<rootDir>/../client/node_modules'
  ]
};