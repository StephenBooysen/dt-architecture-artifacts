# Test Suite

This directory contains comprehensive unit tests for the Architecture Artifacts application.

## Structure

```
tests/
├── components/           # React component tests
│   ├── FileTree.test.js
│   ├── MarkdownEditor.test.js
│   └── GitIntegration.test.js
├── server.test.js       # Server API tests
├── api.test.js          # Client API service tests
├── fileTypeDetector.test.js  # Utility function tests
├── jest.config.js       # Jest configuration
├── setupTests.js        # Test environment setup
├── .babelrc            # Babel configuration for tests
└── README.md           # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Server Tests Only
```bash
npm run test:server
```

### Client Tests Only
```bash
npm run test:client
```

## Test Coverage

The test suite covers:

### Server-side (server/index.js)
- File operations (create, read, update, delete)
- Folder operations
- Git integration (commit, push, pull, clone, status)
- File upload handling
- API monitoring
- Security features (path traversal prevention)
- Error handling

### Client-side Components
- **FileTree**: File/folder navigation, context menus, CRUD operations
- **MarkdownEditor**: Content editing, auto-save, syntax highlighting, toolbar
- **GitIntegration**: Git operations UI, status display, repository cloning

### Services & Utilities
- **API Service**: HTTP client wrapper, error handling
- **File Type Detector**: File type detection, icon mapping

## Test Features

### Mocking
- API calls mocked with Jest
- External dependencies (simple-git, multer) mocked
- Browser APIs (localStorage, fetch, etc.) mocked
- React components mocked where appropriate

### Test Environment
- jsdom for DOM simulation
- Babel for ES6+ and JSX transformation
- Setup files for global test configuration
- Custom matchers from @testing-library/jest-dom

### Coverage Thresholds
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Writing Tests

### Component Tests
- Use React Testing Library for component testing
- Test user interactions and component behavior
- Mock external dependencies
- Focus on testing what users see and do

### API Tests
- Use supertest for server endpoint testing
- Mock external services and databases
- Test both success and error scenarios
- Verify security measures

### Utility Tests
- Test pure functions with various inputs
- Include edge cases and error conditions
- Test integration between related utilities

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component/function does, not how it does it
2. **Arrange, Act, Assert**: Structure tests with clear setup, execution, and verification phases
3. **Descriptive Test Names**: Use clear, descriptive test names that explain what is being tested
4. **Mock External Dependencies**: Isolate units under test by mocking external services
5. **Test Error Cases**: Don't just test the happy path - test error scenarios too
6. **Keep Tests Simple**: Each test should focus on one specific behavior or feature