/**
 * @fileoverview Unit tests for the cache singleton.
 */

const cacheService = require('../../server/src/services/caching/singleton');
const EventEmitter = require('events');

describe('Cache Singleton', () => {
  let cache;
  let mockEventEmitter;

  beforeEach(() => {
    // Reset singleton before each test
    cacheService.reset();
    mockEventEmitter = new EventEmitter();
    jest.spyOn(mockEventEmitter, 'emit');
    cache = cacheService.initialize('memory', {}, mockEventEmitter);
  });

  afterEach(() => {
    // Clean up after each test
    cacheService.reset();
  });

  it('should put and get a value', async () => {
    await cache.put('key', 'value');
    await expect(cache.get('key')).resolves.toBe('value');
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache:put', {
      key: 'key',
      value: 'value',
    });
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache:get', {
      key: 'key',
      value: 'value',
    });
  });

  it('should delete a value', async () => {
    await cache.put('key', 'value');
    mockEventEmitter.emit.mockClear(); // Clear previous emits
    await cache.delete('key');
    await expect(cache.get('key')).resolves.toBeUndefined();
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache:delete', {
      key: 'key',
    });
  });

  it('should return undefined for a non-existent key', async () => {
    await expect(cache.get('non-existent-key')).resolves.toBeUndefined();
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache:get', {
      key: 'non-existent-key',
      value: undefined,
    });
  });

  it('should maintain singleton behavior', () => {
    const cache1 = cacheService.getInstance();
    const cache2 = cacheService.getInstance();
    expect(cache1).toBe(cache2);
  });

  it('should throw error when accessing uninitialized singleton', () => {
    cacheService.reset();
    expect(() => cacheService.getInstance()).toThrow('Cache singleton not initialized');
  });

  it('should return same instance on multiple initializations', () => {
    const cache1 = cacheService.initialize('memory', {}, mockEventEmitter);
    const cache2 = cacheService.initialize('memory', {}, mockEventEmitter);
    expect(cache1).toBe(cache2);
  });
});
