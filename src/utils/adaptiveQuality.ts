/**
 * Adaptive Quality Settings
 * 
 * Automatically adjusts quality settings based on:
 * - Device capabilities (CPU, RAM)
 * - Current memory usage
 * - Real-time performance metrics
 */

import { memoryMonitor } from '@utils/memoryMonitor';

export type QualityLevel = 'high' | 'medium' | 'low';

export interface QualitySettings {
  level: QualityLevel;
  ocr: {
    workerCount: number;
    enableParallel: boolean;
    skipLowConfidence: boolean;
    confidenceThreshold: number;
  };
  rendering: {
    cacheSize: number;
    maxZoomLevel: number;
    enableLazyLoad: boolean;
    devicePixelRatio: number;
  };
  editing: {
    maxUndoHistory: number;
    enableSmoothing: boolean;
    throttleMs: number;
  };
  performance: {
    enableProfiling: boolean;
    enableMemoryWarnings: boolean;
    gcInterval: number; // milliseconds
  };
}

class AdaptiveQualityManager {
  private static instance: AdaptiveQualityManager;
  private currentLevel: QualityLevel = 'medium';
  private settings: QualitySettings = this.getDefaultSettings('medium');
  private listeners: Map<string, ((data?: unknown) => void)[]> = new Map();

  private constructor() {
    this.detectAndSetQuality();
    this.startMonitoring();
  }

  static getInstance(): AdaptiveQualityManager {
    if (!AdaptiveQualityManager.instance) {
      AdaptiveQualityManager.instance = new AdaptiveQualityManager();
    }
    return AdaptiveQualityManager.instance;
  }

  /**
   * Auto-detect quality settings on startup
   */
  private detectAndSetQuality(): void {
    if (memoryMonitor.isLowEnd()) {
      this.setQuality('low');
      console.log('[Quality] Detected low-end device, using LOW quality settings');
    } else {
      const recommendation = memoryMonitor.getQualityRecommendation();
      this.setQuality(recommendation);
      console.log(`[Quality] Using ${recommendation.toUpperCase()} quality settings`);
    }
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    // Monitor memory every 5 seconds
    setInterval(() => {
      memoryMonitor.recordSample();
      this.evaluateAndAdjust();
    }, 5000);
  }

  /**
   * Evaluate current conditions and adjust quality if needed
   */
  private evaluateAndAdjust(): void {
    const recommendation = memoryMonitor.getQualityRecommendation();
    
    if (recommendation !== this.currentLevel) {
      console.log(`[Quality] Adjusting from ${this.currentLevel} to ${recommendation}`);
      this.setQuality(recommendation);
      this.emit('quality-changed', { from: this.currentLevel, to: recommendation });
    }

    // Warn if memory trend is increasing (possible leak)
    const trend = memoryMonitor.getMemoryTrend();
    if (trend === 'increasing' && this.settings.performance.enableMemoryWarnings) {
      this.emit('memory-trend', { trend });
    }
  }

  /**
   * Set quality level
   */
  setQuality(level: QualityLevel): void {
    if (level === this.currentLevel) return;

    this.currentLevel = level;
    this.settings = this.getDefaultSettings(level);
    this.emit('quality-level-changed', { level });
  }

  /**
   * Get default settings for a quality level
   */
  private getDefaultSettings(level: QualityLevel): QualitySettings {
    const baseSettings: Record<QualityLevel, QualitySettings> = {
      high: {
        level: 'high',
        ocr: {
          workerCount: 4,
          enableParallel: true,
          skipLowConfidence: false,
          confidenceThreshold: 0.5,
        },
        rendering: {
          cacheSize: 20,
          maxZoomLevel: 4.0,
          enableLazyLoad: true,
          devicePixelRatio: window.devicePixelRatio || 1,
        },
        editing: {
          maxUndoHistory: 100,
          enableSmoothing: true,
          throttleMs: 50,
        },
        performance: {
          enableProfiling: true,
          enableMemoryWarnings: false,
          gcInterval: 30000,
        },
      },
      medium: {
        level: 'medium',
        ocr: {
          workerCount: 2,
          enableParallel: true,
          skipLowConfidence: true,
          confidenceThreshold: 0.6,
        },
        rendering: {
          cacheSize: 10,
          maxZoomLevel: 3.0,
          enableLazyLoad: true,
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        },
        editing: {
          maxUndoHistory: 50,
          enableSmoothing: true,
          throttleMs: 100,
        },
        performance: {
          enableProfiling: true,
          enableMemoryWarnings: true,
          gcInterval: 20000,
        },
      },
      low: {
        level: 'low',
        ocr: {
          workerCount: 1,
          enableParallel: false,
          skipLowConfidence: true,
          confidenceThreshold: 0.75,
        },
        rendering: {
          cacheSize: 5,
          maxZoomLevel: 2.0,
          enableLazyLoad: true,
          devicePixelRatio: 1.0,
        },
        editing: {
          maxUndoHistory: 20,
          enableSmoothing: false,
          throttleMs: 200,
        },
        performance: {
          enableProfiling: false,
          enableMemoryWarnings: true,
          gcInterval: 10000,
        },
      },
    };

    return baseSettings[level];
  }

  /**
   * Get current quality level
   */
  getQuality(): QualityLevel {
    return this.currentLevel;
  }

  /**
   * Get current settings
   */
  getSettings(): QualitySettings {
    return this.settings;
  }

  /**
   * Get a specific setting
   */
  getSetting<K extends keyof QualitySettings>(key: K): QualitySettings[K] {
    return this.settings[key];
  }

  /**
   * Apply custom settings
   */
  applyCustomSettings(overrides: Partial<QualitySettings>): void {
    this.settings = { ...this.settings, ...overrides };
    this.emit('settings-changed', { settings: this.settings });
  }

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled(feature: 'parallel-ocr' | 'lazy-load' | 'smoothing' | 'profiling'): boolean {
    switch (feature) {
      case 'parallel-ocr':
        return this.settings.ocr.enableParallel && this.settings.ocr.workerCount > 1;
      case 'lazy-load':
        return this.settings.rendering.enableLazyLoad;
      case 'smoothing':
        return this.settings.editing.enableSmoothing;
      case 'profiling':
        return this.settings.performance.enableProfiling;
      default:
        return false;
    }
  }

  /**
   * Get memory-based recommendations
   */
  getRecommendation(): { action: string; reason: string } | null {
    const summary = memoryMonitor.getSummary();
    const trend = memoryMonitor.getMemoryTrend();

    if (memoryMonitor.isCritical()) {
      return {
        action: 'reduce-cache',
        reason: `Memory critical: ${(summary.current / 1024 / 1024).toFixed(0)}MB used`,
      };
    }

    if (trend === 'increasing' && summary.current > 100 * 1024 * 1024) {
      return {
        action: 'investigate-leak',
        reason: 'Memory usage increasing over time',
      };
    }

    if (this.currentLevel === 'low' && memoryMonitor.getAvailableMemoryPercent() > 60) {
      return {
        action: 'upgrade-quality',
        reason: 'Sufficient memory available',
      };
    }

    return null;
  }

  /**
   * Subscribe to quality changes
   */
  on(event: string, callback: (data?: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, callback: (data?: unknown) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

export const adaptiveQualityManager = AdaptiveQualityManager.getInstance();
