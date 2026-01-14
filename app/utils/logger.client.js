/**
 * Client-side logger utility with configurable log levels
 * Supports: debug, info, warn, error
 * Default level: warn (only warnings and errors)
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};

class Logger {
  constructor() {
    this.currentLevel = LOG_LEVELS.warn; // Default to warn
    this.prefix = '[GeoDeals]';
  }

  setLevel(level) {
    const normalizedLevel = level?.toLowerCase() || 'warn';
    if (LOG_LEVELS.hasOwnProperty(normalizedLevel)) {
      this.currentLevel = LOG_LEVELS[normalizedLevel];
      console.log(`${this.prefix} Log level set to: ${normalizedLevel.toUpperCase()}`);
    } else {
      console.warn(`${this.prefix} Invalid log level: ${level}. Using 'warn' as default.`);
      this.currentLevel = LOG_LEVELS.warn;
    }
  }

  debug(...args) {
    if (this.currentLevel <= LOG_LEVELS.debug) {
      console.log(`${this.prefix} [DEBUG]`, ...args);
    }
  }

  info(...args) {
    if (this.currentLevel <= LOG_LEVELS.info) {
      console.info(`${this.prefix} [INFO]`, ...args);
    }
  }

  warn(...args) {
    if (this.currentLevel <= LOG_LEVELS.warn) {
      console.warn(`${this.prefix} [WARN]`, ...args);
    }
  }

  error(...args) {
    if (this.currentLevel <= LOG_LEVELS.error) {
      console.error(`${this.prefix} [ERROR]`, ...args);
    }
  }

  // Group logs for better organization
  group(label, callback) {
    if (this.currentLevel <= LOG_LEVELS.debug) {
      console.group(`${this.prefix} ${label}`);
      callback();
      console.groupEnd();
    }
  }

  // Log with custom styling (only in debug mode)
  styled(message, styles = 'color: #008060; font-weight: bold;') {
    if (this.currentLevel <= LOG_LEVELS.debug) {
      console.log(`%c${this.prefix} ${message}`, styles);
    }
  }

  // Log object/array with better formatting
  table(data) {
    if (this.currentLevel <= LOG_LEVELS.debug && Array.isArray(data)) {
      console.table(data);
    }
  }

  // Performance timing
  time(label) {
    if (this.currentLevel <= LOG_LEVELS.debug) {
      console.time(`${this.prefix} ${label}`);
    }
  }

  timeEnd(label) {
    if (this.currentLevel <= LOG_LEVELS.debug) {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Initialize from window if available (set by the app)
if (typeof window !== 'undefined' && window.__CONVERTBOOST_LOG_LEVEL__) {
  logger.setLevel(window.__CONVERTBOOST_LOG_LEVEL__);
}

export default logger;
