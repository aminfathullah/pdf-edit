/**
 * PDFEditor Performance Optimizations
 * 
 * This module exports performance-optimized functions for lazy loading
 * WASM modules and large dependencies
 */

/**
 * Lazy load OCR service
 * The OCR service is only loaded when the user actually needs OCR
 * This significantly reduces initial bundle size
 */
export async function initializeLazyOCR() {
  try {
    const { getOCRService } = await import(
      /* webpackChunkName: "ocr-service" */
      '@modules/detection/OCRService'
    );
    const ocrService = getOCRService();
    await ocrService.initialize();
    return ocrService;
  } catch (error) {
    console.error('Failed to initialize OCR service', error);
    throw error;
  }
}

/**
 * Lazy load PDF exporter
 * Export functionality is deferred until needed
 */
export async function initializeLazyExporter() {
  try {
    const { getPDFExporter } = await import(
      /* webpackChunkName: "pdf-exporter" */
      '@modules/export/PDFExporter'
    );
    return getPDFExporter();
  } catch (error) {
    console.error('Failed to initialize PDF exporter', error);
    throw error;
  }
}

/**
 * Cache for lazy-loaded modules
 */
const lazyModuleCache: Record<string, any> = {};

/**
 * Generic lazy loader with caching
 */
export async function lazyLoadModule(moduleName: string, importFn: () => Promise<any>) {
  if (lazyModuleCache[moduleName]) {
    return lazyModuleCache[moduleName];
  }

  const module = await importFn();
  lazyModuleCache[moduleName] = module;
  return module;
}

/**
 * Clear lazy module cache (useful for testing)
 */
export function clearLazyModuleCache(moduleName?: string) {
  if (moduleName) {
    delete lazyModuleCache[moduleName];
  } else {
    Object.keys(lazyModuleCache).forEach((key) => {
      delete lazyModuleCache[key];
    });
  }
}

/**
 * Get module cache size (for debugging)
 */
export function getLazyModuleCacheSize() {
  return Object.keys(lazyModuleCache).length;
}
