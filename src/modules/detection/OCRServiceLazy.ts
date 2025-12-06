/**
 * OCRService Lazy Loader
 * 
 * Dynamically loads Tesseract.js OCR worker only when needed
 * This reduces initial bundle size significantly
 */

import type { OCRResult, OCRProgress } from '@core/types';

let ocrServiceInstance: any = null;

/**
 * Lazy load OCR service
 * Import is deferred until first use to reduce initial bundle size
 */
async function loadOCRService() {
  if (ocrServiceInstance) {
    return ocrServiceInstance;
  }

  // Dynamic import - this will be code split by webpack
  const { getOCRService } = await import(/* webpackChunkName: "ocr-service" */ '@modules/detection/OCRService');
  ocrServiceInstance = getOCRService();
  
  return ocrServiceInstance;
}

/**
 * Run OCR with lazy loading
 */
export async function runOCRLazy(
  canvas: HTMLCanvasElement,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const ocrService = await loadOCRService();
  return ocrService.runOCR(canvas, onProgress);
}

/**
 * Run OCR on image with lazy loading
 */
export async function runOCROnImageLazy(
  imageUrl: string,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const ocrService = await loadOCRService();
  return ocrService.runOCROnImage(imageUrl, onProgress);
}

/**
 * Get loaded OCR service instance
 */
export async function getOCRServiceLazy() {
  return loadOCRService();
}
