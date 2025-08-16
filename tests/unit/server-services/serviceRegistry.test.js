/**
 * @fileoverview Unit tests for the service registry.
 */

const serviceRegistry = require('../../server/src/services/index');
const EventEmitter = require('events');

describe('Service Registry', () => {
  let mockEventEmitter;

  beforeEach(() => {
    mockEventEmitter = new EventEmitter();
    jest.spyOn(mockEventEmitter, 'emit');
    
    // Reset all services before each test
    serviceRegistry.resetAll();
  });

  afterEach(() => {
    // Clean up after each test
    serviceRegistry.resetAll();
  });

  describe('Service Access', () => {
    it('should get service by name', () => {
      const cacheService = serviceRegistry.get('cache');
      expect(cacheService).toBeDefined();
      expect(cacheService.getServiceName()).toBe('Cache');
    });

    it('should throw error for non-existent service', () => {
      expect(() => serviceRegistry.get('nonexistent')).toThrow(
        "Service 'nonexistent' not found"
      );
    });

    it('should check if service exists', () => {
      expect(serviceRegistry.has('cache')).toBe(true);
      expect(serviceRegistry.has('nonexistent')).toBe(false);
    });

    it('should get all service names', () => {
      const serviceNames = serviceRegistry.getServiceNames();
      expect(serviceNames).toEqual([
        'cache', 'dataserve', 'filing', 'logging', 'measuring',
        'notifying', 'queueing', 'scheduling', 'searching', 'workflow', 'working'
      ]);
    });
  });

  describe('Service Status', () => {
    it('should return status of all services', () => {
      const status = serviceRegistry.getStatus();
      
      // All services should be uninitialized initially
      Object.values(status).forEach(serviceStatus => {
        expect(serviceStatus.initialized).toBe(false);
      });
    });

    it('should show initialized status after initialization', () => {
      const cacheService = serviceRegistry.get('cache');
      cacheService.initialize('memory', {}, mockEventEmitter);
      
      const status = serviceRegistry.getStatus();
      expect(status.cache.initialized).toBe(true);
    });
  });

  describe('Convenience Getters', () => {
    it('should provide direct access to services', () => {
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

  describe('Bulk Operations', () => {
    it('should initialize all services', () => {
      const results = serviceRegistry.initializeAll({}, mockEventEmitter);
      
      // Check that all services were initialized
      expect(Object.keys(results)).toHaveLength(11);
      Object.values(results).forEach(result => {
        expect(result).toBeTruthy();
      });
      
      // Verify status shows all as initialized
      const status = serviceRegistry.getStatus();
      Object.values(status).forEach(serviceStatus => {
        expect(serviceStatus.initialized).toBe(true);
      });
    });

    it('should reset all services', () => {
      // First initialize all services
      serviceRegistry.initializeAll({}, mockEventEmitter);
      
      // Verify they're initialized
      let status = serviceRegistry.getStatus();
      Object.values(status).forEach(serviceStatus => {
        expect(serviceStatus.initialized).toBe(true);
      });
      
      // Reset all
      serviceRegistry.resetAll();
      
      // Verify they're reset
      status = serviceRegistry.getStatus();
      Object.values(status).forEach(serviceStatus => {
        expect(serviceStatus.initialized).toBe(false);
      });
    });
  });

  describe('Individual Service Functionality', () => {
    beforeEach(() => {
      serviceRegistry.initializeAll({}, mockEventEmitter);
    });

    it('should work with cache service', async () => {
      await serviceRegistry.cache.put('test', 'value');
      const value = await serviceRegistry.cache.get('test');
      expect(value).toBe('value');
    });

    it('should work with logging service', () => {
      // Should not throw
      expect(() => serviceRegistry.logging.info('Test message')).not.toThrow();
    });

    it('should work with measuring service', async () => {
      // Should not throw
      expect(() => serviceRegistry.measuring.measure('test.metric', 100)).not.toThrow();
    });
  });
});