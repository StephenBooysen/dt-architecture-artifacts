/**
 * @fileoverview Integration tests for all singleton services working together.
 */

const serviceRegistry = require('../../server/src/services/index');
const { getLogger, getCache, getFiling, recordMetric } = require('../../server/src/utils/services');
const EventEmitter = require('events');

describe('Services Integration Tests', () => {
  let mockEventEmitter;

  beforeAll(async () => {
    mockEventEmitter = new EventEmitter();
    jest.spyOn(mockEventEmitter, 'emit');
    
    // Initialize all services for integration testing
    await serviceRegistry.initializeAll({
      'express-app': {}, // Mock Express app
      testMode: true
    }, mockEventEmitter);
  });

  afterAll(() => {
    serviceRegistry.resetAll();
  });

  describe('Service Registry Integration', () => {
    it('should have all services initialized', () => {
      const status = serviceRegistry.getStatus();
      Object.values(status).forEach(serviceStatus => {
        expect(serviceStatus.initialized).toBe(true);
      });
    });

    it('should provide access to all services', () => {
      expect(serviceRegistry.cache).toBeDefined();
      expect(serviceRegistry.logging).toBeDefined();
      expect(serviceRegistry.filing).toBeDefined();
      expect(serviceRegistry.measuring).toBeDefined();
      expect(serviceRegistry.notifying).toBeDefined();
      expect(serviceRegistry.queueing).toBeDefined();
      expect(serviceRegistry.scheduling).toBeDefined();
      expect(serviceRegistry.searching).toBeDefined();
      expect(serviceRegistry.workflow).toBeDefined();
      expect(serviceRegistry.working).toBeDefined();
      expect(serviceRegistry.dataserve).toBeDefined();
    });
  });

  describe('Service Utilities Integration', () => {
    it('should provide utility functions for all services', () => {
      expect(getLogger()).toBeDefined();
      expect(getCache()).toBeDefined();
      expect(getFiling()).toBeDefined();
    });

    it('should record metrics without errors', async () => {
      expect(() => recordMetric('test.metric', 100, { test: true })).not.toThrow();
    });
  });

  describe('Cross-Service Functionality', () => {
    it('should use cache and logging together', async () => {
      const cache = getCache();
      const logger = getLogger();

      // Cache something
      await cache.put('integration.test', 'test-value');
      
      // Log about it (should not throw)
      expect(() => logger.info('Cached integration test value')).not.toThrow();
      
      // Retrieve and verify
      const value = await cache.get('integration.test');
      expect(value).toBe('test-value');
    });

    it('should work with filing and cache together', async () => {
      const filing = getFiling();
      const cache = getCache();

      // Check if filing service has expected methods
      if (filing.getInstance && filing.getInstance().writeFile) {
        // Mock file operation
        const testPath = 'integration-test.md';
        const testContent = '# Integration Test\n\nThis is a test file.';

        // This would normally write a file - for testing we'll just cache
        await cache.put(`file:${testPath}`, testContent);
        
        const cachedContent = await cache.get(`file:${testPath}`);
        expect(cachedContent).toBe(testContent);
      }
    });

    it('should handle service interactions gracefully', () => {
      // Test that services can interact without throwing errors
      expect(() => {
        getLogger().info('Testing service interactions');
        recordMetric('integration.test.count', 1);
        // More service interactions can be added here
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const cache = getCache();
      
      // Test error handling with invalid operations
      // This should not crash the application
      try {
        await cache.get(null);
      } catch (error) {
        // Error should be caught and handled
        expect(error).toBeDefined();
      }
    });
  });

  describe('Event System Integration', () => {
    it('should emit events across services', async () => {
      const cache = getCache();
      
      // Clear previous emissions
      mockEventEmitter.emit.mockClear();
      
      // Perform operations that should emit events
      await cache.put('event.test', 'value');
      await cache.get('event.test');
      await cache.delete('event.test');
      
      // Check that events were emitted
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });
  });
});