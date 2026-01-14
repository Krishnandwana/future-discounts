// Performance monitoring utility for Geo Deals
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.isClient = typeof window !== 'undefined';
  }

  // Start timing an operation
  startTimer(operation) {
    const startTime = this.isClient ? performance.now() : Date.now();
    this.metrics.set(`${operation}_start`, startTime);
    return startTime;
  }

  // End timing and calculate duration
  endTimer(operation) {
    const startTime = this.metrics.get(`${operation}_start`);
    if (!startTime) {
      console.warn(`No start timer found for operation: ${operation}`);
      return 0;
    }

    const endTime = this.isClient ? performance.now() : Date.now();
    const duration = endTime - startTime;
    
    this.metrics.set(`${operation}_duration`, duration);
    this.metrics.delete(`${operation}_start`);
    
    return duration;
  }

  // Measure component render time
  measureRender(componentName, renderFn) {
    const startTime = this.startTimer(`render_${componentName}`);
    const result = renderFn();
    const duration = this.endTimer(`render_${componentName}`);
    
    if (duration > 100) { // Log slow renders
      console.warn(`🐌 Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  // Measure API call performance
  async measureAPI(apiName, apiFn) {
    const startTime = this.startTimer(`api_${apiName}`);
    
    try {
      const result = await apiFn();
      const duration = this.endTimer(`api_${apiName}`);
      
      console.log(`⚡ API ${apiName}: ${duration.toFixed(2)}ms`);
      
      if (duration > 2000) { // Log slow API calls
        console.warn(`🐌 Slow API: ${apiName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      this.endTimer(`api_${apiName}`);
      throw error;
    }
  }

  // Measure database query performance
  async measureDB(queryName, queryFn) {
    const startTime = this.startTimer(`db_${queryName}`);
    
    try {
      const result = await queryFn();
      const duration = this.endTimer(`db_${queryName}`);
      
      if (duration > 1000) { // Log slow queries
        console.warn(`🐌 Slow query: ${queryName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      this.endTimer(`db_${queryName}`);
      throw error;
    }
  }

  // Get Web Vitals (client-side only)
  getWebVitals() {
    if (!this.isClient) return null;

    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation) return null;

    return {
      // Core Web Vitals
      LCP: this.getLCP(),
      FID: this.getFID(),
      CLS: this.getCLS(),
      
      // Other metrics
      TTFB: navigation.responseStart - navigation.requestStart,
      FCP: this.getFCP(),
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      totalLoadTime: navigation.loadEventEnd - navigation.navigationStart
    };
  }

  // Largest Contentful Paint
  getLCP() {
    if (!this.isClient) return null;
    
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        return lastEntry ? lastEntry.startTime : null;
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      return null;
    }
  }

  // First Contentful Paint
  getFCP() {
    if (!this.isClient) return null;
    
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry ? fcpEntry.startTime : null;
  }

  // First Input Delay (estimated)
  getFID() {
    if (!this.isClient) return null;
    // FID requires user interaction, so this is a placeholder
    return null;
  }

  // Cumulative Layout Shift (estimated)
  getCLS() {
    if (!this.isClient) return null;
    // CLS requires layout shift observer, simplified here
    return null;
  }

  // Get memory usage (client-side only)
  getMemoryUsage() {
    if (!this.isClient || !performance.memory) return null;

    return {
      usedJSMemory: performance.memory.usedJSHeapSize,
      totalJSMemory: performance.memory.totalJSHeapSize,
      jsMemoryLimit: performance.memory.jsHeapSizeLimit,
      memoryUsagePercentage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2)
    };
  }

  // Get all performance metrics
  getAllMetrics() {
    const webVitals = this.getWebVitals();
    const memoryUsage = this.getMemoryUsage();
    
    return {
      webVitals,
      memoryUsage,
      customMetrics: Object.fromEntries(
        Array.from(this.metrics.entries()).filter(([key]) => key.endsWith('_duration'))
      ),
      timestamp: new Date().toISOString()
    };
  }

  // Log performance summary
  logSummary() {
    const metrics = this.getAllMetrics();
    console.group('📊 Performance Summary');
    
    if (metrics.webVitals) {
      console.log('Web Vitals:', metrics.webVitals);
    }
    
    if (metrics.memoryUsage) {
      console.log('Memory Usage:', `${metrics.memoryUsage.memoryUsagePercentage}%`);
    }
    
    if (Object.keys(metrics.customMetrics).length > 0) {
      console.log('Custom Metrics:', metrics.customMetrics);
    }
    
    console.groupEnd();
    
    return metrics;
  }

  // Clear all metrics
  clear() {
    this.metrics.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience wrapper for measuring functions
export const measure = {
  render: (componentName, renderFn) => performanceMonitor.measureRender(componentName, renderFn),
  api: (apiName, apiFn) => performanceMonitor.measureAPI(apiName, apiFn),
  db: (queryName, queryFn) => performanceMonitor.measureDB(queryName, queryFn)
};

// Performance monitoring hook for React components
export const usePerformanceMonitor = (componentName) => {
  if (typeof window === 'undefined') return { measure: () => {} };
  
  return {
    measure: (operation, fn) => performanceMonitor.measureRender(`${componentName}_${operation}`, fn),
    getMetrics: () => performanceMonitor.getAllMetrics(),
    logSummary: () => performanceMonitor.logSummary()
  };
};