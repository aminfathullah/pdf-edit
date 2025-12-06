/**
 * Performance Monitoring Utility
 * 
 * Tracks and reports performance metrics for the PDF Editor.
 */

interface PerformanceMetric {
  name: string;
  times: number[];
  lastValue: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private maxSamples = 100;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring a performance metric
   * Returns a function to stop the measurement
   */
  startMeasure(name: string): () => number {
    const start = performance.now();

    return () => {
      const end = performance.now();
      const duration = end - start;
      this.recordMetric(name, duration);
      return duration;
    };
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, times: [], lastValue: 0 });
    }

    const metric = this.metrics.get(name)!;
    metric.times.push(value);
    metric.lastValue = value;

    // Keep only the last N samples
    if (metric.times.length > this.maxSamples) {
      metric.times.shift();
    }
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string): {
    avg: number;
    min: number;
    max: number;
    last: number;
    count: number;
  } | null {
    const metric = this.metrics.get(name);
    if (!metric || metric.times.length === 0) return null;

    const times = metric.times;
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      avg: sum / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      last: metric.lastValue,
      count: times.length,
    };
  }

  /**
   * Get all metrics
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const result: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const name of this.metrics.keys()) {
      result[name] = this.getStats(name);
    }
    return result;
  }

  /**
   * Log performance report to console
   */
  report(): void {
    const stats = this.getAllStats();
    console.debug('📊 Performance Report:');
    console.debug('='.repeat(60));

    for (const [name, data] of Object.entries(stats)) {
      if (data) {
        console.debug(
          `${name}: avg=${data.avg.toFixed(2)}ms, min=${data.min.toFixed(2)}ms, max=${data.max.toFixed(2)}ms (${data.count} samples)`
        );
      }
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Check if a metric exceeds a threshold
   */
  checkThreshold(name: string, threshold: number): boolean {
    const stats = this.getStats(name);
    return stats ? stats.avg > threshold : false;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Decorator for measuring method execution time
 */
export function measureTime(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    const stopMeasure = performanceMonitor.startMeasure(propertyKey);
    const result = originalMethod.apply(this, args);

    if (result instanceof Promise) {
      return result.finally(() => stopMeasure());
    }

    stopMeasure();
    return result;
  };

  return descriptor;
}
