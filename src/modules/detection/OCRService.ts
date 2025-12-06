/**
 * OCRService - Optical Character Recognition with Tesseract.js
 * 
 * Provides OCR capabilities for scanned PDF documents.
 */

import Tesseract, { Worker, createWorker } from 'tesseract.js';
import type { OCRResult, OCRBox, OCRProgress, OCRStatus } from '@core/types';
import { OCR_CONFIG, EVENTS } from '@core/constants';
import { eventBus } from '@utils/EventBus';
import { createLogger } from '@utils/logger';
import { performanceMonitor } from '@utils/performance';

const logger = createLogger('OCRService');

type SupportedLanguage = typeof OCR_CONFIG.SUPPORTED_LANGUAGES[number];

export class OCRService {
  private workers: Worker[] = [];
  private isInitialized = false;
  private currentLanguage: SupportedLanguage = OCR_CONFIG.DEFAULT_LANGUAGE;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the OCR service with worker pool
   */
  async initialize(language: SupportedLanguage = OCR_CONFIG.DEFAULT_LANGUAGE): Promise<void> {
    if (this.isInitialized && this.currentLanguage === language) {
      return;
    }

    // Prevent multiple initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize(language);
    return this.initPromise;
  }

  private async _initialize(language: SupportedLanguage): Promise<void> {
    const stopMeasure = performanceMonitor.startMeasure('ocr-init');

    try {
      // Terminate existing workers
      await this.terminate();

      logger.info(`Initializing OCR service with language: ${language}`);

      // Create worker pool
      for (let i = 0; i < OCR_CONFIG.WORKER_POOL_SIZE; i++) {
        const worker = await createWorker(language, 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') {
              eventBus.publish(EVENTS.OCR_PROGRESS, {
                status: 'processing' as OCRStatus,
                progress: m.progress * 100,
                message: `Processing: ${Math.round(m.progress * 100)}%`,
              });
            }
          },
        });

        this.workers.push(worker);
      }

      this.currentLanguage = language;
      this.isInitialized = true;

      const initTime = stopMeasure();
      logger.info(`OCR service initialized in ${initTime.toFixed(2)}ms with ${this.workers.length} workers`);
    } catch (error) {
      logger.error('Failed to initialize OCR service', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Run OCR on a canvas element
   */
  async runOCR(
    canvas: HTMLCanvasElement,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    if (!this.isInitialized || this.workers.length === 0) {
      await this.initialize();
    }

    const worker = this.workers[0]; // Use first available worker
    const stopMeasure = performanceMonitor.startMeasure('ocr-process');

    try {
      // Emit start event
      eventBus.publish(EVENTS.OCR_PROGRESS, {
        status: 'processing' as OCRStatus,
        progress: 0,
        message: 'Starting OCR...',
      });

      onProgress?.({
        status: 'processing',
        progress: 0,
        message: 'Starting OCR...',
      });

      // Convert canvas to image data
      const imageData = canvas.toDataURL('image/png');

      // Run OCR
      const result = await worker.recognize(imageData);

      const processingTime = stopMeasure();

      // Extract bounding boxes
      const boxes = this.extractBoxes(result);

      // Calculate average confidence
      const avgConfidence =
        boxes.length > 0
          ? boxes.reduce((sum, box) => sum + box.confidence, 0) / boxes.length
          : 0;

      const ocrResult: OCRResult = {
        text: result.data.text,
        boxes,
        confidence: avgConfidence,
        processingTime,
        language: this.currentLanguage,
      };

      logger.info(
        `OCR completed in ${processingTime.toFixed(2)}ms, confidence: ${(avgConfidence * 100).toFixed(1)}%`
      );

      // Emit completion event
      eventBus.publish(EVENTS.OCR_COMPLETE, ocrResult);

      onProgress?.({
        status: 'complete',
        progress: 100,
        message: 'OCR complete',
      });

      return ocrResult;
    } catch (error) {
      logger.error('OCR processing failed', error);

      eventBus.publish(EVENTS.OCR_ERROR, { error });

      onProgress?.({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'OCR failed',
      });

      throw error;
    }
  }

  /**
   * Run OCR on an image URL
   */
  async runOCROnImage(
    imageUrl: string,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    if (!this.isInitialized || this.workers.length === 0) {
      await this.initialize();
    }

    const worker = this.workers[0];
    const stopMeasure = performanceMonitor.startMeasure('ocr-process-image');

    try {
      onProgress?.({
        status: 'processing',
        progress: 0,
        message: 'Starting OCR...',
      });

      const result = await worker.recognize(imageUrl);

      const processingTime = stopMeasure();
      const boxes = this.extractBoxes(result);
      const avgConfidence =
        boxes.length > 0
          ? boxes.reduce((sum, box) => sum + box.confidence, 0) / boxes.length
          : 0;

      const ocrResult: OCRResult = {
        text: result.data.text,
        boxes,
        confidence: avgConfidence,
        processingTime,
        language: this.currentLanguage,
      };

      onProgress?.({
        status: 'complete',
        progress: 100,
        message: 'OCR complete',
      });

      return ocrResult;
    } catch (error) {
      logger.error('OCR processing failed', error);
      throw error;
    }
  }

  /**
   * Detect if a canvas contains a scanned image (no text layer)
   */
  async detectScannedPage(canvas: HTMLCanvasElement): Promise<boolean> {
    // Analyze the canvas to determine if it's a scanned image
    // This is a heuristic based on pixel analysis
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Count unique colors and pixel variance
    const colorSet = new Set<string>();
    let totalVariance = 0;
    const sampleRate = Math.max(1, Math.floor(data.length / 4 / 10000)); // Sample ~10000 pixels

    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Create color key (quantized to reduce unique colors)
      const colorKey = `${Math.floor(r / 16)},${Math.floor(g / 16)},${Math.floor(b / 16)}`;
      colorSet.add(colorKey);

      // Calculate variance from white (scanned docs are mostly white)
      const distFromWhite = Math.sqrt(
        Math.pow(255 - r, 2) + Math.pow(255 - g, 2) + Math.pow(255 - b, 2)
      );
      totalVariance += distFromWhite;
    }

    const avgVariance = totalVariance / (data.length / 4 / sampleRate);
    const uniqueColors = colorSet.size;

    // Scanned documents typically have:
    // - High number of unique colors (grayscale noise)
    // - Medium variance (mostly white with some dark text/images)
    const isScanned = uniqueColors > 500 && avgVariance > 20 && avgVariance < 100;

    logger.debug(`Scanned page detection: uniqueColors=${uniqueColors}, avgVariance=${avgVariance.toFixed(2)}, isScanned=${isScanned}`);

    return isScanned;
  }

  /**
   * Change the OCR language
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    if (!(OCR_CONFIG.SUPPORTED_LANGUAGES as readonly string[]).includes(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    if (this.currentLanguage !== language) {
      await this.initialize(language);
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [...OCR_CONFIG.SUPPORTED_LANGUAGES];
  }

  /**
   * Check if OCR is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.workers.length > 0;
  }

  /**
   * Extract bounding boxes from Tesseract result
   */
  private extractBoxes(result: Tesseract.RecognizeResult): OCRBox[] {
    const boxes: OCRBox[] = [];
    const words = result.data.words || [];

    for (const word of words) {
      if (word.confidence < OCR_CONFIG.CONFIDENCE_THRESHOLD * 100) {
        continue; // Skip low confidence words
      }

      boxes.push({
        text: word.text,
        confidence: word.confidence / 100,
        x: word.bbox.x0,
        y: word.bbox.y0,
        width: word.bbox.x1 - word.bbox.x0,
        height: word.bbox.y1 - word.bbox.y0,
      });
    }

    return boxes;
  }

  /**
   * Terminate all workers
   */
  async terminate(): Promise<void> {
    for (const worker of this.workers) {
      try {
        await worker.terminate();
      } catch (error) {
        logger.warn('Error terminating OCR worker', error);
      }
    }
    this.workers = [];
    this.isInitialized = false;
    this.initPromise = null;
    logger.info('OCR service terminated');
  }
}

// Export singleton instance
let ocrServiceInstance: OCRService | null = null;

export function getOCRService(): OCRService {
  if (!ocrServiceInstance) {
    ocrServiceInstance = new OCRService();
  }
  return ocrServiceInstance;
}
