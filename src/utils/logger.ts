/**
 * Logger Utility
 * 
 * Provides consistent logging across the application with levels and formatting.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isProduction = false;

  private constructor() {
    // Check if production
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(module: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${module}] ${message}`;
  }

  private addToHistory(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'debug',
      module,
      message,
      data,
    };
    this.addToHistory(entry);

    if (!this.isProduction) {
      console.debug(this.formatMessage(module, message), data ?? '');
    }
  }

  info(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog('info')) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      module,
      message,
      data,
    };
    this.addToHistory(entry);

    if (!this.isProduction) {
      // Using console.debug instead of console.log per eslint rules
      console.debug(`ℹ️ ${this.formatMessage(module, message)}`, data ?? '');
    }
  }

  warn(module: string, message: string, data?: unknown): void {
    if (!this.shouldLog('warn')) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'warn',
      module,
      message,
      data,
    };
    this.addToHistory(entry);

    console.warn(`⚠️ ${this.formatMessage(module, message)}`, data ?? '');
  }

  error(module: string, message: string, error?: Error | unknown): void {
    if (!this.shouldLog('error')) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      module,
      message,
      data: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    };
    this.addToHistory(entry);

    console.error(`❌ ${this.formatMessage(module, message)}`, error ?? '');
  }

  getHistory(): LogEntry[] {
    return [...this.logs];
  }

  clearHistory(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = Logger.getInstance();

// Module-specific logger factory
export function createLogger(module: string) {
  return {
    debug: (message: string, data?: unknown) => logger.debug(module, message, data),
    info: (message: string, data?: unknown) => logger.info(module, message, data),
    warn: (message: string, data?: unknown) => logger.warn(module, message, data),
    error: (message: string, error?: Error | unknown) => logger.error(module, message, error),
  };
}
