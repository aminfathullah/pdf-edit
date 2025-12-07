/**
 * RenderEngine - PDF Rendering with PDF.js
 * 
 * Handles loading and rendering PDF documents to canvas elements.
 */

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { RenderConfig, PageDimensions } from '@core/types';
import { EVENTS } from '@core/constants';
import { eventBus } from '@utils/EventBus';
import { createLogger } from '@utils/logger';
import { performanceMonitor } from '@utils/performance';
import { adaptiveQualityManager } from '@utils/adaptiveQuality';

const logger = createLogger('RenderEngine');

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export class RenderEngine {
  private pdf: PDFDocumentProxy | null = null;
  private pdfVersion: string | null = null;
  private pageCache: Map<string, HTMLCanvasElement> = new Map();
  private pageProxyCache: Map<number, PDFPageProxy> = new Map();
  private config: Required<RenderConfig>;
  private isLoading = false;

  constructor(config: RenderConfig = {}) {
    const qualitySettings = adaptiveQualityManager.getSettings();
    this.config = {
      maxPages: config.maxPages ?? 100,
      cacheSize: config.cacheSize ?? qualitySettings.rendering.cacheSize,
      devicePixelRatio: config.devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
      quality: config.quality ?? 'high',
    };

    // Listen for quality level changes
    adaptiveQualityManager.on('quality-level-changed', (data: any) => {
      const newSettings = adaptiveQualityManager.getSettings();
      const newCacheSize = newSettings.rendering.cacheSize;
      logger.info(`Quality level changed to ${data.level}, updating cache size from ${this.config.cacheSize} to ${newCacheSize}`);
      this.config.cacheSize = newCacheSize;

      // Trim cache if necessary
      if (this.pageCache.size > this.config.cacheSize) {
        const toRemove = this.pageCache.size - this.config.cacheSize;
        let removed = 0;
        for (const key of this.pageCache.keys()) {
          if (removed >= toRemove) break;
          this.pageCache.delete(key);
          removed++;
        }
      }
    });
  }

  /**
   * Load a PDF from ArrayBuffer
   */
  async loadPDF(arrayBuffer: ArrayBuffer): Promise<{ pageCount: number }> {
    if (this.isLoading) {
      throw new Error('PDF is already being loaded');
    }

    this.isLoading = true;
    const stopMeasure = performanceMonitor.startMeasure('pdf-load');

    try {
      // Clear previous document
      this.clearCache();

      // Load the PDF
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
        cMapPacked: true,
      });

      this.pdf = await loadingTask.promise;

      const pageCount = this.pdf.numPages;
      // Try to detect PDF version from pdfjs metadata or pdfInfo
      try {
        const meta = await this.pdf.getMetadata();
        const pdfInfoVersion = (this.pdf as any)?.pdfInfo?.pdfFormatVersion || (meta.info && (((meta.info as any).PDFFormatVersion) || ((meta.info as any).pdfFormatVersion)));
        this.pdfVersion = pdfInfoVersion ? String(pdfInfoVersion) : null;
        if (this.pdfVersion) {
          logger.info(`Detected PDF version: ${this.pdfVersion}`);
        }
      } catch (err) {
        logger.debug('Unable to determine PDF version', err);
        this.pdfVersion = null;
      }
      logger.info(`PDF loaded successfully with ${pageCount} pages`);

      // Emit event
      eventBus.publish(EVENTS.DOCUMENT_LOADED, {
        pageCount,
        documentId: this.pdf.fingerprints[0],
      });

      return { pageCount };
    } catch (error) {
      logger.error('Failed to load PDF', error);
      eventBus.publish(EVENTS.DOCUMENT_ERROR, { error });
      throw error;
    } finally {
      this.isLoading = false;
      stopMeasure();
    }
  }

  /**
   * Render a specific page to canvas
   */
  async renderPage(pageNum: number, scale: number = 1.0): Promise<HTMLCanvasElement> {
    if (!this.pdf) {
      throw new Error('No PDF loaded');
    }

    if (pageNum < 1 || pageNum > this.pdf.numPages) {
      throw new Error(`Invalid page number: ${pageNum}. PDF has ${this.pdf.numPages} pages.`);
    }

    // Check cache
    const cacheKey = `${pageNum}-${scale}-${this.config.devicePixelRatio}`;
    const cached = this.pageCache.get(cacheKey);
    if (cached) {
      logger.debug(`Returning cached page ${pageNum} at scale ${scale}`);
      return cached;
    }

    const stopMeasure = performanceMonitor.startMeasure(`render-page-${pageNum}`);

    try {
      // Get or cache page proxy
      let page = this.pageProxyCache.get(pageNum);
      if (!page) {
        page = await this.pdf.getPage(pageNum);
        this.pageProxyCache.set(pageNum, page);
      }

      // Get viewport with scale
      const viewport = page.getViewport({ scale });

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get 2D canvas context');
      }

      // Apply device pixel ratio for crisp rendering
      const dpr = this.config.devicePixelRatio;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Scale context for device pixel ratio
      context.scale(dpr, dpr);

      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Cache the canvas
      this.cacheCanvas(cacheKey, canvas);

      const renderTime = stopMeasure();
      logger.debug(`Page ${pageNum} rendered in ${renderTime.toFixed(2)}ms`);

      // Emit event
      eventBus.publish(EVENTS.PAGE_RENDERED, {
        pageNumber: pageNum,
        canvas,
        renderTime,
      });

      return canvas;
    } catch (error) {
      logger.error(`Failed to render page ${pageNum}`, error);
      eventBus.publish(EVENTS.RENDER_ERROR, { pageNum, error });
      throw error;
    }
  }

  /**
   * Get page dimensions
   */
  async getPageDimensions(pageNum: number): Promise<PageDimensions> {
    if (!this.pdf) {
      throw new Error('No PDF loaded');
    }

    let page = this.pageProxyCache.get(pageNum);
    if (!page) {
      page = await this.pdf.getPage(pageNum);
      this.pageProxyCache.set(pageNum, page);
    }

    const viewport = page.getViewport({ scale: 1.0 });

    return {
      width: viewport.width,
      height: viewport.height,
      rotation: page.rotate as PageDimensions['rotation'],
    };
  }

  /**
   * Get total page count
   */
  getPageCount(): number {
    return this.pdf?.numPages ?? 0;
  }

  /**
   * Check if a PDF is loaded
   */
  isLoaded(): boolean {
    return this.pdf !== null;
  }

  /**
   * Get PDF metadata
   */
  async getMetadata(): Promise<{
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pdfVersion?: string;
  }> {
    if (!this.pdf) {
      throw new Error('No PDF loaded');
    }

    const metadata = await this.pdf.getMetadata();
    const info = metadata.info as Record<string, unknown>;

    const metadataObj = {
      title: info?.Title as string | undefined,
      author: info?.Author as string | undefined,
      subject: info?.Subject as string | undefined,
      keywords: info?.Keywords as string | undefined,
      creator: info?.Creator as string | undefined,
      producer: info?.Producer as string | undefined,
      creationDate: info?.CreationDate ? new Date(info.CreationDate as string) : undefined,
      modificationDate: info?.ModDate ? new Date(info.ModDate as string) : undefined,
    };

    // Include version if available
    return {
      ...metadataObj,
      pdfVersion: this.pdfVersion ?? undefined,
    };
  }

  /**
   * Get the detected PDF version (if known)
   */
  getPDFVersion(): string | null {
    return this.pdfVersion;
  }

  /**
   * Get the PDF document proxy
   */
  getPDFDocument(): PDFDocumentProxy | null {
    return this.pdf;
  }

  /**
   * Cache a canvas
   */
  private cacheCanvas(key: string, canvas: HTMLCanvasElement): void {
    this.pageCache.set(key, canvas);

    // Cleanup cache if exceeds size limit
    if (this.pageCache.size > this.config.cacheSize) {
      const firstKey = this.pageCache.keys().next().value;
      if (firstKey) {
        this.pageCache.delete(firstKey);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.pageCache.clear();
    this.pageProxyCache.clear();
    logger.debug('Render cache cleared');
  }

  /**
   * Destroy the render engine and free resources
   */
  async destroy(): Promise<void> {
    this.clearCache();
    if (this.pdf) {
      await this.pdf.destroy();
      this.pdf = null;
    }
    logger.info('RenderEngine destroyed');
  }
}

// Export singleton instance
let renderEngineInstance: RenderEngine | null = null;

export function getRenderEngine(config?: RenderConfig): RenderEngine {
  if (!renderEngineInstance) {
    renderEngineInstance = new RenderEngine(config);
  }
  return renderEngineInstance;
}
