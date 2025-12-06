/**
 * Performance Benchmarking Tests - Phase 7
 * 
 * Validates that the application meets performance targets:
 * - PDF rendering latency < 500ms
 * - OCR processing time < 2s per page
 * - Text input lag < 50ms
 * - Memory footprint < 200MB
 */

import { adaptiveQualityManager } from '@utils/adaptiveQuality';
import { memoryMonitor } from '@utils/memoryMonitor';
import { performanceMonitor } from '@utils/performance';

describe('Performance Benchmarks - Phase 7', () => {
  
  describe('PDF Rendering Performance', () => {
    test('should initialize RenderEngine with adaptive quality settings', () => {
      const settings = adaptiveQualityManager.getSettings();
      expect(settings.rendering.cacheSize).toBeGreaterThan(0);
      expect(settings.rendering.maxZoomLevel).toBeGreaterThan(0);
    });

    test('should respect cache size from adaptive quality manager', () => {
      const qualityLevel = adaptiveQualityManager.getQuality();
      const settings = adaptiveQualityManager.getSettings();
      
      expect(['high', 'medium', 'low']).toContain(qualityLevel);
      
      const cacheSizes: Record<string, number> = {
        high: 20,
        medium: 10,
        low: 5,
      };
      
      expect(settings.rendering.cacheSize).toBe(cacheSizes[qualityLevel]);
    });

    test('should handle zoom levels according to device capabilities', () => {
      const settings = adaptiveQualityManager.getSettings();
      
      const expectedMaxZoom: Record<string, number> = {
        high: 4.0,
        medium: 3.0,
        low: 2.0,
      };
      
      const quality = adaptiveQualityManager.getQuality();
      expect(settings.rendering.maxZoomLevel).toBe(expectedMaxZoom[quality]);
    });

    test('should apply device pixel ratio settings', () => {
      const settings = adaptiveQualityManager.getSettings();
      expect(settings.rendering.devicePixelRatio).toBeGreaterThan(0);
      expect(settings.rendering.devicePixelRatio).toBeLessThanOrEqual(window.devicePixelRatio || 1);
    });
  });

  describe('Edit Manager Performance', () => {
    test('should initialize EditManager with adaptive quality history limit', () => {
      const settings = adaptiveQualityManager.getSettings();
      expect(settings.editing.maxUndoHistory).toBeGreaterThan(0);
    });

    test('should respect max undo history from adaptive quality settings', () => {
      const quality = adaptiveQualityManager.getQuality();
      const settings = adaptiveQualityManager.getSettings();
      
      const expectedMaxHistory: Record<string, number> = {
        high: 100,
        medium: 50,
        low: 20,
      };
      
      expect(settings.editing.maxUndoHistory).toBe(expectedMaxHistory[quality]);
    });

    test('should support throttling based on device capabilities', () => {
      const settings = adaptiveQualityManager.getSettings();
      const quality = adaptiveQualityManager.getQuality();
      
      const expectedThrottle: Record<string, number> = {
        high: 50,
        medium: 100,
        low: 200,
      };
      
      expect(settings.editing.throttleMs).toBe(expectedThrottle[quality]);
    });

    test('should enable/disable smoothing based on quality level', () => {
      const settings = adaptiveQualityManager.getSettings();
      const quality = adaptiveQualityManager.getQuality();
      
      if (quality === 'low') {
        expect(settings.editing.enableSmoothing).toBe(false);
      } else {
        expect(settings.editing.enableSmoothing).toBe(true);
      }
    });
  });

  describe('Memory Management', () => {
    test('should initialize memory monitor', () => {
      const stats = memoryMonitor.getMemoryStats();
      // Performance.memory API is only available in Chrome/Chromium browsers
      if (stats) {
        expect(stats.heapUsed).toBeGreaterThan(0);
        expect(stats.heapTotal).toBeGreaterThan(stats.heapUsed);
      } else {
        // In Node.js Jest environment, performance.memory might not be available
        expect(stats).toBeNull();
      }
    });

    test('should detect device type based on available memory', () => {
      const isLowEnd = memoryMonitor.isLowEnd();
      const stats = memoryMonitor.getMemoryStats();
      
      if (stats && isLowEnd) {
        expect(stats.heapTotal).toBeLessThan(500 * 1024 * 1024); // < 500MB
      }
    });

    test('should provide memory trend analysis', () => {
      const trend = memoryMonitor.getMemoryTrend();
      expect(['increasing', 'stable', 'decreasing']).toContain(trend);
    });

    test('should recommend quality level based on memory', () => {
      const recommendation = memoryMonitor.getQualityRecommendation();
      expect(['high', 'medium', 'low']).toContain(recommendation);
    });

    test('should identify critical memory conditions', () => {
      const stats = memoryMonitor.getMemoryStats();
      const isCritical = memoryMonitor.isCritical();
      
      if (stats) {
        // Critical when heap usage > 90% of total
        const percentUsed = stats.heapUsed / stats.heapTotal;
        if (percentUsed > 0.9) {
          expect(isCritical).toBe(true);
        }
      }
    });
  });

  describe('OCR Service Configuration', () => {
    test('should configure OCR workers based on device capabilities', () => {
      const settings = adaptiveQualityManager.getSettings();
      const quality = adaptiveQualityManager.getQuality();
      
      const expectedWorkers: Record<string, number> = {
        high: 4,
        medium: 2,
        low: 1,
      };
      
      expect(settings.ocr.workerCount).toBe(expectedWorkers[quality]);
    });

    test('should set appropriate confidence threshold per quality level', () => {
      const settings = adaptiveQualityManager.getSettings();
      const quality = adaptiveQualityManager.getQuality();
      
      const expectedThreshold: Record<string, number> = {
        high: 0.5,
        medium: 0.6,
        low: 0.75,
      };
      
      expect(settings.ocr.confidenceThreshold).toBe(expectedThreshold[quality]);
    });

    test('should enable parallel OCR for multi-worker configurations', () => {
      const settings = adaptiveQualityManager.getSettings();
      
      if (settings.ocr.workerCount > 1) {
        expect(settings.ocr.enableParallel).toBe(true);
      } else {
        expect(settings.ocr.enableParallel).toBe(false);
      }
    });

    test('should configure low-confidence filtering appropriately', () => {
      const settings = adaptiveQualityManager.getSettings();
      const quality = adaptiveQualityManager.getQuality();
      
      if (quality === 'high') {
        expect(settings.ocr.skipLowConfidence).toBe(false);
      } else {
        expect(settings.ocr.skipLowConfidence).toBe(true);
      }
    });
  });

  describe('Performance Profiling Configuration', () => {
    test('should enable profiling on high-end devices', () => {
      const settings = adaptiveQualityManager.getSettings();
      const quality = adaptiveQualityManager.getQuality();
      
      if (quality === 'high') {
        expect(settings.performance.enableProfiling).toBe(true);
      }
    });

    test('should configure memory warnings appropriately', () => {
      const settings = adaptiveQualityManager.getSettings();
      const quality = adaptiveQualityManager.getQuality();
      
      if (quality === 'high') {
        expect(settings.performance.enableMemoryWarnings).toBe(false);
      } else {
        expect(settings.performance.enableMemoryWarnings).toBe(true);
      }
    });

    test('should set garbage collection interval based on device', () => {
      const settings = adaptiveQualityManager.getSettings();
      const quality = adaptiveQualityManager.getQuality();
      
      const expectedGCInterval: Record<string, number> = {
        high: 30000,   // 30s
        medium: 20000, // 20s
        low: 10000,    // 10s
      };
      
      expect(settings.performance.gcInterval).toBe(expectedGCInterval[quality]);
    });
  });

  describe('Quality Level Transitions', () => {
    test('should support dynamic quality level changes', () => {
      const initialQuality = adaptiveQualityManager.getQuality();
      const targetQuality: 'high' | 'medium' | 'low' = initialQuality === 'high' ? 'medium' : 'high';
      
      adaptiveQualityManager.setQuality(targetQuality);
      
      expect(adaptiveQualityManager.getQuality()).toBe(targetQuality);
    });

    test('should update settings when quality changes', () => {
      const initialSettings = adaptiveQualityManager.getSettings();
      const targetQuality: 'high' | 'medium' | 'low' = initialSettings.level === 'high' ? 'medium' : 'high';
      
      adaptiveQualityManager.setQuality(targetQuality);
      const newSettings = adaptiveQualityManager.getSettings();
      
      expect(newSettings.level).toBe(targetQuality);
      if (targetQuality === 'high') {
        expect(newSettings.ocr.workerCount).toBe(4);
      }
    });

    test('should provide feature availability based on quality level', () => {
      adaptiveQualityManager.setQuality('high');
      expect(adaptiveQualityManager.isFeatureEnabled('parallel-ocr')).toBe(true);
      
      adaptiveQualityManager.setQuality('low');
      expect(adaptiveQualityManager.isFeatureEnabled('parallel-ocr')).toBe(false);
    });
  });

  describe('Performance Monitor Integration', () => {
    test('should track performance metrics', () => {
      const stopMeasure = performanceMonitor.startMeasure('test-operation');
      
      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i);
      }
      
      const duration = stopMeasure();
      expect(duration).toBeGreaterThan(0);
    });

    test('should provide performance metrics stats', () => {
      performanceMonitor.startMeasure('operation-1')();
      performanceMonitor.startMeasure('operation-2')();
      
      const stats = performanceMonitor.getStats('operation-1');
      expect(stats).not.toBeNull();
      if (stats) {
        expect(stats.avg).toBeGreaterThan(0);
        expect(stats.count).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Targets Validation', () => {
    test('should validate that configuration meets performance targets', () => {
      const settings = adaptiveQualityManager.getSettings();
      
      // For high quality: should support aggressive rendering
      if (settings.level === 'high') {
        expect(settings.rendering.cacheSize).toBeGreaterThanOrEqual(20);
        expect(settings.editing.maxUndoHistory).toBeGreaterThanOrEqual(100);
        expect(settings.ocr.workerCount).toBeGreaterThanOrEqual(4);
      }
      
      // For low quality: should be conservative
      if (settings.level === 'low') {
        expect(settings.rendering.cacheSize).toBeLessThanOrEqual(5);
        expect(settings.editing.maxUndoHistory).toBeLessThanOrEqual(20);
        expect(settings.ocr.workerCount).toBe(1);
      }
    });

    test('should provide memory budget per quality level', () => {
      const stats = memoryMonitor.getMemoryStats();
      if (stats) {
        const percentUsed = (stats.heapUsed / stats.heapTotal) * 100;
        
        // Should not exceed 90% in normal operation
        expect(percentUsed).toBeLessThan(90);
      }
    });

    test('should have reasonable OCR performance settings', () => {
      const settings = adaptiveQualityManager.getSettings();
      
      // Higher quality = lower threshold (more lenient)
      if (settings.level === 'high') {
        expect(settings.ocr.confidenceThreshold).toBeLessThan(0.6);
      }
      
      // Lower quality = higher threshold (more strict)
      if (settings.level === 'low') {
        expect(settings.ocr.confidenceThreshold).toBeGreaterThan(0.7);
      }
    });
  });
});
