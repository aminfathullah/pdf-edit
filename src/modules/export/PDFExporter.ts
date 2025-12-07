/**
 * PDFExporter - PDF Export and Download Management
 * 
 * Handles the full export workflow including generation and download.
 */

import type { ExportOptions, Edit } from '@core/types';
import { EXPORT_CONFIG } from '@core/constants';
import { downloadBlob, formatFileSize } from '@utils/helpers';
import { createLogger } from '@utils/logger';
import { getPDFGenerator } from './PDFGenerator';

const logger = createLogger('PDFExporter');

export class PDFExporter {
  private generator = getPDFGenerator();
  private originalFilename = 'document';
  private originalSize = 0;

  /**
   * Set original document info
   */
  setOriginalDocument(filename: string, size: number): void {
    this.originalFilename = filename.replace(/\.pdf$/i, '');
    this.originalSize = size;
  }

  /**
   * Export the edited PDF
   */
  async exportPDF(
    pages: Array<{
      canvas: HTMLCanvasElement;
      width: number;
      height: number;
      edits: Edit[];
      annotations?: unknown[];
      formFields?: unknown[];
    }>,
    options: ExportOptions = {}
  ): Promise<{ buffer: ArrayBuffer; filename: string; size: number }> {
    logger.info('Starting PDF export...');

    try {
      // Generate PDF
      const buffer = await this.generator.generatePDF(pages, options);

      // Validate
      const validation = this.generator.validatePDF(buffer);
      if (!validation.isValid) {
        throw new Error(`PDF validation failed: ${validation.error}`);
      }

      // Check file size increase
      if (this.originalSize > 0) {
        const sizeRatio = buffer.byteLength / this.originalSize;
        if (sizeRatio > EXPORT_CONFIG.MAX_FILE_SIZE_INCREASE) {
          logger.warn(`Output file size increased by ${(sizeRatio * 100).toFixed(0)}%`);
        }
      }

      // Generate filename
      const filename = options.filename || `${this.originalFilename}${EXPORT_CONFIG.OUTPUT_FILE_SUFFIX}.pdf`;

      logger.info(`PDF exported: ${filename}, size: ${formatFileSize(buffer.byteLength)}`);

      return {
        buffer,
        filename,
        size: buffer.byteLength,
      };
    } catch (error) {
      logger.error('PDF export failed', error);
      throw error;
    }
  }

  /**
   * Export and download the PDF
   */
  async exportAndDownload(
    pages: Array<{
      canvas: HTMLCanvasElement;
      width: number;
      height: number;
      edits: Edit[];
      annotations?: unknown[];
      formFields?: unknown[];
    }>,
    options: ExportOptions = {}
  ): Promise<void> {
    const { buffer, filename } = await this.exportPDF(pages, options);

    // Create blob and download
    const blob = new Blob([buffer], { type: 'application/pdf' });
    downloadBlob(blob, filename);

    logger.info(`PDF downloaded: ${filename}`);
  }

  /**
   * Export as data URL (for preview)
   */
  async exportAsDataURL(
    pages: Array<{
      canvas: HTMLCanvasElement;
      width: number;
      height: number;
      edits: Edit[];
      annotations?: unknown[];
      formFields?: unknown[];
    }>,
    options: ExportOptions = {}
  ): Promise<string> {
    const { buffer } = await this.exportPDF(pages, options);

    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return `data:application/pdf;base64,${base64}`;
  }

  /**
   * Get estimated output size
   */
  estimateOutputSize(
    pages: Array<{ canvas: HTMLCanvasElement }>,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): number {
    const qualityMultipliers = { low: 0.3, medium: 0.6, high: 0.9 };
    const multiplier = qualityMultipliers[quality];

    let totalPixels = 0;
    for (const page of pages) {
      totalPixels += page.canvas.width * page.canvas.height;
    }

    // Rough estimate: ~0.5 bytes per pixel at medium quality
    return Math.round(totalPixels * 0.5 * multiplier);
  }
}

// Export singleton instance
let pdfExporterInstance: PDFExporter | null = null;

export function getPDFExporter(): PDFExporter {
  if (!pdfExporterInstance) {
    pdfExporterInstance = new PDFExporter();
  }
  return pdfExporterInstance;
}
