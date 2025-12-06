/**
 * Memory Monitor - Track memory usage and performance
 * 
 * Helps identify memory leaks and enables adaptive quality settings
 * for low-end devices.
 */

interface MemoryStats {
  timestamp: Date;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

class MemoryMonitor {
  private static instance: MemoryMonitor;
  private memoryHistory: MemoryStats[] = [];
  private maxSamples = 60; // Keep 60 samples (~1 min at 1 Hz)
  private isLowEndDevice = false;
  private memoryWarningThreshold = 150 * 1024 * 1024; // 150MB
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {
    this.detectDeviceCapabilities();
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Detect if device is low-end based on available memory
   */
  private detectDeviceCapabilities(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const availableMemory = memory.jsHeapSizeLimit;
      // Consider device low-end if heap limit < 500MB
      this.isLowEndDevice = availableMemory < 500 * 1024 * 1024;
    }
  }

  /**
   * Get current memory stats
   */
  getMemoryStats(): MemoryStats | null {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        timestamp: new Date(),
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        external: 0, // Not reliably available in all browsers
        arrayBuffers: this.estimateArrayBufferSize(),
      };
    }
    return null;
  }

  /**
   * Record memory sample
   */
  recordSample(): void {
    const stats = this.getMemoryStats();
    if (stats) {
      this.memoryHistory.push(stats);
      if (this.memoryHistory.length > this.maxSamples) {
        this.memoryHistory.shift();
      }

      // Check if memory usage exceeds warning threshold
      if (stats.heapUsed > this.memoryWarningThreshold) {
        this.emit('memory-warning', stats);
      }
    }
  }

  /**
   * Get memory trend (is memory increasing or stable?)
   */
  getMemoryTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.memoryHistory.length < 10) return 'stable';

    const oldest = this.memoryHistory[0];
    const newest = this.memoryHistory[this.memoryHistory.length - 1];

    const delta = newest.heapUsed - oldest.heapUsed;
    const deltaPercent = (delta / oldest.heapUsed) * 100;

    if (deltaPercent > 20) return 'increasing';
    if (deltaPercent < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Check if memory usage is critical
   */
  isCritical(): boolean {
    const stats = this.getMemoryStats();
    if (!stats) return false;
    // Warn if using >90% of heap
    return stats.heapUsed > stats.heapTotal * 0.9;
  }

  /**
   * Is this a low-end device?
   */
  isLowEnd(): boolean {
    return this.isLowEndDevice;
  }

  /**
   * Get available memory percentage
   */
  getAvailableMemoryPercent(): number {
    const stats = this.getMemoryStats();
    if (!stats) return 100;
    return ((stats.heapTotal - stats.heapUsed) / stats.heapTotal) * 100;
  }

  /**
   * Get memory stats summary
   */
  getSummary(): {
    current: number;
    average: number;
    peak: number;
    trend: string;
  } {
    if (this.memoryHistory.length === 0) {
      return { current: 0, average: 0, peak: 0, trend: 'stable' };
    }

    const values = this.memoryHistory.map(s => s.heapUsed);
    const current = values[values.length - 1];
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const peak = Math.max(...values);

    return {
      current,
      average,
      peak,
      trend: this.getMemoryTrend(),
    };
  }

  /**
   * Get quality recommendation based on memory
   */
  getQualityRecommendation(): 'high' | 'medium' | 'low' {
    if (this.isLowEndDevice) {
      return 'low';
    }

    const percent = this.getAvailableMemoryPercent();
    if (percent < 20) return 'low'; // < 20% available = low quality
    if (percent < 40) return 'medium'; // 20-40% = medium quality
    return 'high'; // > 40% = high quality
  }

  /**
   * Clear history
   */
  clear(): void {
    this.memoryHistory = [];
  }

  /**
   * Subscribe to memory events
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  /**
   * Estimate size of ArrayBuffer allocations
   */
  private estimateArrayBufferSize(): number {
    // This is a rough estimate - we'd need more sophisticated tracking
    // For now, return 0 as it's not reliably available
    return 0;
  }

  /**
   * Force garbage collection (not always possible)
   */
  triggerGC(): void {
    // This is a suggestion to the JS engine, not guaranteed to work
    if (typeof gc !== 'undefined') {
      gc();
    }
  }
}

export const memoryMonitor = MemoryMonitor.getInstance();
