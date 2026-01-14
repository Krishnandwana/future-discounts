/**
 * Test Runner for Purchase Intent Classifier
 * 
 * This file provides a simple test runner that can be executed in a browser
 * or Node.js environment to validate the Purchase Intent Classifier functionality.
 */

// Simple test framework for browser/Node.js compatibility
class SimpleTestFramework {
  constructor() {
    this.tests = [];
    this.suites = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      errors: []
    };
  }
  
  describe(suiteName, suiteFunc) {
    const suite = {
      name: suiteName,
      tests: [],
      beforeEach: null,
      afterEach: null
    };
    
    const originalTests = this.tests;
    this.tests = suite.tests;
    
    // Mock Jest-like functions
    global.beforeEach = (func) => { suite.beforeEach = func; };
    global.afterEach = (func) => { suite.afterEach = func; };
    global.test = this.test.bind(this);
    global.expect = this.expect.bind(this);
    
    try {
      suiteFunc();
      this.suites.push(suite);
    } catch (error) {
      this.results.errors.push(`Suite "${suiteName}" failed: ${error.message}`);
    }
    
    this.tests = originalTests;
  }
  
  test(testName, testFunc) {
    this.tests.push({
      name: testName,
      func: testFunc
    });
  }
  
  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeGreaterThanOrEqual: (expected) => {
        if (actual < expected) {
          throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
        }
      },
      toBeLessThan: (expected) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toBeLessThanOrEqual: (expected) => {
        if (actual > expected) {
          throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
        }
      },
      toHaveLength: (expected) => {
        if (!actual || actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual?.length || 'undefined'}`);
        }
      },
      toContain: (expected) => {
        if (!actual || !actual.includes(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to contain ${expected}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error('Expected value to be defined');
        }
      },
      not: {
        toThrow: () => {
          try {
            if (typeof actual === 'function') {
              actual();
            }
          } catch (error) {
            throw new Error(`Expected function not to throw, but it threw: ${error.message}`);
          }
        }
      }
    };
  }
  
  async run() {
    console.log('🧪 Starting Purchase Intent Classifier Tests...\n');
    
    for (const suite of this.suites) {
      console.log(`📦 Suite: ${suite.name}`);
      
      for (const test of suite.tests) {
        this.results.total++;
        
        try {
          // Run beforeEach if it exists
          if (suite.beforeEach) {
            suite.beforeEach();
          }
          
          // Run the test
          await test.func();
          
          // Run afterEach if it exists
          if (suite.afterEach) {
            suite.afterEach();
          }
          
          this.results.passed++;
          console.log(`  ✅ ${test.name}`);
        } catch (error) {
          this.results.failed++;
          this.results.errors.push(`${suite.name} > ${test.name}: ${error.message}`);
          console.log(`  ❌ ${test.name}: ${error.message}`);
        }
      }
      
      console.log('');
    }
    
    this.printResults();
  }
  
  printResults() {
    console.log('📊 Test Results:');
    console.log(`Total: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    
    if (this.results.failed > 0) {
      console.log('\n💥 Failures:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    const passRate = (this.results.passed / this.results.total * 100).toFixed(1);
    console.log(`\n🎯 Pass Rate: ${passRate}%`);
    
    if (this.results.failed === 0) {
      console.log('🎉 All tests passed!');
    }
  }
}

// Mock environment setup for browser/Node.js
const setupMockEnvironment = () => {
  // Mock localStorage
  if (typeof localStorage === 'undefined') {
    global.localStorage = {
      store: {},
      getItem: function(key) { return this.store[key] || null; },
      setItem: function(key, value) { this.store[key] = value; },
      removeItem: function(key) { delete this.store[key]; },
      clear: function() { this.store = {}; }
    };
  }
  
  // Mock console if needed
  if (typeof console === 'undefined') {
    global.console = {
      log: () => {},
      error: () => {}
    };
  }
  
  // Mock performance if needed
  if (typeof performance === 'undefined') {
    global.performance = {
      now: () => Date.now()
    };
  }
  
  // Mock Date.now for consistent testing
  const originalDateNow = Date.now;
  global.Date.now = () => new Date('2024-01-01T10:00:00Z').getTime();
  
  return () => {
    global.Date.now = originalDateNow;
  };
};

// Simplified Purchase Intent Classifier for testing
class TestPurchaseIntentClassifier {
  constructor(config = {}) {
    this.debugMode = config.debug || false;
    this.config = {
      interventionThresholds: {willing:0.65, hesitating:0.4, notWilling:0.7},
      weights: {
        willing: [0.45, 0.35, -0.2, 0.15, 0.3, 0.4, 0.25],
        hesitating: [0.3, 0.4, 0.5, 0.3, 0.25, 0.35, -0.1],
        notWilling: [-0.6, -0.5, -0.3, -0.4, -0.35, -0.45, -0.2]
      },
      biases: {willing:1.2, hesitating:0.7, notWilling:-1.0},
      intentMultiplier: 10,
      ...config
    };
    
    this.state = {
      behavioralMetrics: {
        cart: {visits:[], abandonments:0, totalTime:0},
        product: {views:{}, comparisons:0, variantChanges:0},
        temporal: {hesitationPeriods:[], decisionTime:0, inactivePeriods:[]},
        navigation: {scrollDepth:0, exitIntent:false, pageChanges:0}
      },
      sessionStart: Date.now(),
      debugEvents: []
    };
    
    this.intentScore = 0;
    this.events = new Set();
    this.cartAbandoned = false;
  }
  
  debugLog(message, data = null) {
    if (this.debugMode) {
      const logEntry = {timestamp: new Date().toISOString(), message, data};
      console.log(`[${logEntry.timestamp}] ${message}`, data || '');
      this.state.debugEvents.push(logEntry);
    }
  }
  
  incrementScore(eventType, points) {
    const basePoints = points * this.config.intentMultiplier;
    const finalPoints = this.cartAbandoned ? basePoints * 1.5 : basePoints;
    this.intentScore += finalPoints;
    this.events.add(eventType);
    this.debugLog(`Score increment: ${eventType}`, {finalPoints, totalScore: this.intentScore});
  }
  
  normalizeFeatures() {
    return {
      cartVisits: Math.min(this.state.behavioralMetrics.cart.visits.length / 5, 1),
      priceComparisons: Math.min(this.state.behavioralMetrics.product.comparisons / 3, 1),
      hesitationTime: Math.min(this.meanHesitationTime() / 10, 1),
      variantChanges: Math.min(this.state.behavioralMetrics.product.variantChanges / 2, 1),
      scrollDepth: this.state.behavioralMetrics.navigation.scrollDepth / 100,
      sessionDuration: Math.min((Date.now() - this.state.sessionStart) / 600000, 1),
      returnRate: 0
    };
  }
  
  calculatePurchaseProbabilities() {
    const features = this.normalizeFeatures();
    const scores = {};
    
    for (const [cls, weights] of Object.entries(this.config.weights)) {
      scores[cls] = weights.reduce((acc, w, i) => 
        acc + w * Object.values(features)[i], this.config.biases[cls]);
    }
    
    const expSum = Object.values(scores).reduce((sum, s) => sum + Math.exp(s), 0);
    const probabilities = {};
    
    for (const [cls, score] of Object.entries(scores)) {
      probabilities[cls] = Math.exp(score) / expSum;
    }
    
    return probabilities;
  }
  
  meanHesitationTime() {
    const periods = this.state.behavioralMetrics.temporal.hesitationPeriods;
    return periods.length > 0 ? periods.reduce((a, b) => a + b, 0) / periods.length : 0;
  }
  
  determineIntervention() {
    const probs = this.calculatePurchaseProbabilities();
    const thresholds = this.config.interventionThresholds;
    
    if (probs.willing >= thresholds.willing) return 'conversion';
    if (probs.hesitating >= thresholds.hesitating) return 'hesitation';
    if (probs.notWilling >= thresholds.notWilling) return 'reengagement';
    return 'observe';
  }
}

// Test definitions
const runTests = async () => {
  const cleanup = setupMockEnvironment();
  const framework = new SimpleTestFramework();
  
  // Set up global functions
  global.describe = framework.describe.bind(framework);
  
  // Basic functionality tests
  framework.describe('Purchase Intent Classifier - Basic Tests', () => {
    let classifier;
    
    global.beforeEach(() => {
      classifier = new TestPurchaseIntentClassifier({debug: true});
    });
    
    global.test('should initialize correctly', () => {
      global.expect(classifier.intentScore).toBe(0);
      global.expect(classifier.events.size).toBe(0);
      global.expect(classifier.config.intentMultiplier).toBe(10);
    });
    
    global.test('should increment score correctly', () => {
      classifier.incrementScore('add_to_cart', 30);
      global.expect(classifier.intentScore).toBe(300);
      global.expect(classifier.events.size).toBe(1);
    });
    
    global.test('should apply cart abandonment multiplier', () => {
      classifier.cartAbandoned = true;
      classifier.incrementScore('variant_selected', 10);
      global.expect(classifier.intentScore).toBe(150); // 10 * 10 * 1.5
    });
    
    global.test('should calculate probabilities correctly', () => {
      const probs = classifier.calculatePurchaseProbabilities();
      const sum = probs.willing + probs.hesitating + probs.notWilling;
      global.expect(Math.abs(sum - 1)).toBeLessThan(0.001);
    });
    
    global.test('should determine interventions correctly', () => {
      const intervention = classifier.determineIntervention();
      global.expect(['conversion', 'hesitation', 'reengagement', 'observe']).toContain(intervention);
    });
  });
  
  // Debug functionality tests
  framework.describe('Debug Functionality', () => {
    let classifier;
    
    global.beforeEach(() => {
      classifier = new TestPurchaseIntentClassifier({debug: true});
    });
    
    global.test('should log debug messages', () => {
      const originalLog = console.log;
      let logCalled = false;
      console.log = () => { logCalled = true; };
      
      classifier.debugLog('Test message');
      global.expect(logCalled).toBe(true);
      global.expect(classifier.state.debugEvents).toHaveLength(1);
      
      console.log = originalLog;
    });
    
    global.test('should track score increments in debug', () => {
      classifier.incrementScore('test_event', 15);
      global.expect(classifier.state.debugEvents).toHaveLength(1);
      global.expect(classifier.state.debugEvents[0].message).toContain('Score increment');
    });
  });
  
  // Edge cases
  framework.describe('Edge Cases', () => {
    global.test('should handle zero hesitation periods', () => {
      const classifier = new TestPurchaseIntentClassifier();
      global.expect(classifier.meanHesitationTime()).toBe(0);
    });
    
    global.test('should handle feature normalization edge cases', () => {
      const classifier = new TestPurchaseIntentClassifier();
      classifier.state.behavioralMetrics.cart.visits = new Array(10).fill({});
      
      const features = classifier.normalizeFeatures();
      global.expect(features.cartVisits).toBe(1); // Should cap at 1
    });
  });
  
  // Integration test
  framework.describe('Integration Tests', () => {
    global.test('should complete full user journey', () => {
      const classifier = new TestPurchaseIntentClassifier({debug: true});
      
      // Simulate user journey
      classifier.incrementScore('page_view', 5);
      classifier.incrementScore('price_consideration', 20);
      classifier.incrementScore('variant_selected', 10);
      classifier.incrementScore('add_to_cart', 30);
      
      const probs = classifier.calculatePurchaseProbabilities();
      const intervention = classifier.determineIntervention();
      
      global.expect(classifier.intentScore).toBeGreaterThan(0);
      global.expect(classifier.events.size).toBeGreaterThan(0);
      global.expect(Object.values(probs).every(p => p >= 0 && p <= 1)).toBe(true);
      global.expect(['conversion', 'hesitation', 'reengagement', 'observe']).toContain(intervention);
    });
  });
  
  await framework.run();
  cleanup();
  
  return framework.results;
};

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, TestPurchaseIntentClassifier, setupMockEnvironment };
}

// Auto-run if this file is executed directly
if (typeof window === 'undefined') {
  // Check if this is the main module being run
  const scriptPath = process.argv[1];
  const currentFile = new URL(import.meta.url).pathname;
  
  if (scriptPath && scriptPath.endsWith('test-runner.js')) {
    console.log('🚀 Starting Purchase Intent Classifier Tests...\n');
    runTests().then(results => {
      console.log('\n✨ Tests completed!');
      process.exit(results.failed > 0 ? 1 : 0);
    }).catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
  }
}