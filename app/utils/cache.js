// Enhanced in-memory cache for API responses with automatic cleanup
class SimpleCache {
  constructor(defaultTTL = 5 * 60 * 1000, maxSize = 1000) { // 5 minutes default, max 1000 items
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this.stats = { hits: 0, misses: 0, sets: 0 };
    
    // Auto cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  set(key, value, ttl = this.defaultTTL) {
    // Enforce max size - remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const expiryTime = Date.now() + ttl;
    this.cache.set(key, { value, expiryTime, accessTime: Date.now() });
    this.stats.sets++;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiryTime) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access time for LRU tracking
    item.accessTime = Date.now();
    this.stats.hits++;
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiryTime) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  // Destroy cache and cleanup interval
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const apiCache = new SimpleCache();

// Cache key generators
export const getCacheKey = {
  analytics: (shopName, timeframe = 'day') => `analytics_${shopName}_${timeframe}`,
  appEmbed: (shopName) => `appEmbed_${shopName}`,
  usage: (shopName) => `usage_${shopName}`,
  popup: (shopName, popupId) => `popup_${shopName}_${popupId}`,
  metafields: (shopName) => `metafields_${shopName}`,
  billing: (shopName) => `billing_${shopName}`,
  performance: (shopName) => `performance_${shopName}`
};

// Cache wrapper function for easy API integration
export const withCache = async (key, fetchFn, ttl = 5 * 60 * 1000) => {
  // Try to get from cache first
  const cached = apiCache.get(key);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  try {
    const data = await fetchFn();
    apiCache.set(key, data, ttl);
    return data;
  } catch (error) {
    console.error(`Cache fetch error for key ${key}:`, error);
    throw error;
  }
};

export { SimpleCache };
