/**
 * Enhanced file routes using cache singleton
 */

const cacheService = require('../src/services/caching/singleton');

// Cache file content with TTL simulation
async function getCachedFile(filePath, space) {
  const cacheKey = `file:${space}:${filePath}`;
  const timestampKey = `${cacheKey}:timestamp`;
  const TTL = 5 * 60 * 1000; // 5 minutes
  
  try {
    const [cachedData, timestamp] = await Promise.all([
      cacheService.get(cacheKey),
      cacheService.get(timestampKey)
    ]);
    
    if (cachedData && timestamp) {
      const age = Date.now() - timestamp;
      if (age < TTL) {
        console.log(`Cache HIT for ${cacheKey} (age: ${age}ms)`);
        return cachedData;
      } else {
        // Expired - clean up
        await Promise.all([
          cacheService.delete(cacheKey),
          cacheService.delete(timestampKey)
        ]);
        console.log(`Cache EXPIRED for ${cacheKey}`);
      }
    }
    
    return null; // Cache miss
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

async function setCachedFile(filePath, space, data) {
  const cacheKey = `file:${space}:${filePath}`;
  const timestampKey = `${cacheKey}:timestamp`;
  
  try {
    await Promise.all([
      cacheService.put(cacheKey, data),
      cacheService.put(timestampKey, Date.now())
    ]);
    console.log(`Cache SET for ${cacheKey}`);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

// Enhanced file route with caching
function createFileRoute(originalFetchFile) {
  return async (req, res) => {
    const { path: filePath } = req.params;
    const space = req.space || 'default';
    
    try {
      // Try cache first
      let fileData = await getCachedFile(filePath, space);
      
      if (!fileData) {
        // Cache miss - fetch from original source
        fileData = await originalFetchFile(filePath, space);
        
        if (fileData) {
          // Cache the result
          await setCachedFile(filePath, space, fileData);
        }
      }
      
      if (fileData) {
        res.json(fileData);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      console.error('File route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Cache invalidation utility
async function invalidateFileCache(filePath, space) {
  const cacheKey = `file:${space}:${filePath}`;
  const timestampKey = `${cacheKey}:timestamp`;
  
  try {
    await Promise.all([
      cacheService.delete(cacheKey),
      cacheService.delete(timestampKey)
    ]);
    console.log(`Cache INVALIDATED for ${cacheKey}`);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

// Cache warming utility
async function warmFileCache(filePaths, space, fetchFunction) {
  console.log(`Warming cache for ${filePaths.length} files...`);
  
  const promises = filePaths.map(async (filePath) => {
    try {
      const data = await fetchFunction(filePath, space);
      if (data) {
        await setCachedFile(filePath, space, data);
      }
    } catch (error) {
      console.error(`Failed to warm cache for ${filePath}:`, error);
    }
  });
  
  await Promise.allSettled(promises);
  console.log('Cache warming completed');
}

module.exports = {
  getCachedFile,
  setCachedFile,
  createFileRoute,
  invalidateFileCache,
  warmFileCache
};