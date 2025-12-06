/**
 * PDFGenerator - PDF Generation with jsPDF
 * 
 * Generates the final edited PDF document.
 */

import { jsPDF } from 'jspdf';
import type { Edit, ExportOptions, ExportProgress } from '@core/types';
import { EXPORT_CONFIG, EVENTS } from '@core/constants';
import { eventBus } from '@utils/EventBus';
import { createLogger } from '@utils/logger';
import { performanceMonitor } from '@utils/performance';

const logger = createLogger('PDFGenerator');

interface PageData {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  edits: Edit[];
}

export class PDFGenerator {
  private pdf: jsPDF | null = null;

  /**
   * Generate a PDF from edited pages
   */
  async generatePDF(
    pages: PageData[],
    options: ExportOptions = {}
  ): Promise<ArrayBuffer> {
    const stopMeasure = performanceMonitor.startMeasure('pdf-generate');

    try {
      if (pages.length === 0) {
        throw new Error('No pages to generate');
      }

      // Emit start event
      eventBus.publish(EVENTS.EXPORT_STARTED, { pageCount: pages.length });
      this.emitProgress('preparing', 0, 'Preparing PDF...');

      // Get first page dimensions for initial setup
      const firstPage = pages[0];
      const orientation = firstPage.width > firstPage.height ? 'landscape' : 'portrait';

      // Create PDF with first page dimensions
      this.pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [firstPage.width, firstPage.height],
        compress: true,
      });

      // Process each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const progress = ((i + 1) / pages.length) * 100;

        this.emitProgress('generating', progress, `Processing page ${i + 1} of ${pages.length}...`);

        if (i > 0) {
          // Add new page with correct dimensions
          this.pdf.addPage([page.width, page.height]);
        }

        // Add page content as image
        await this.addPageAsImage(page.canvas, page.width, page.height);

        // Add text layer for searchability (if edits exist)
        if (options.preserveText !== false) {
          this.addTextLayer(page.edits, page.height);
        }
      }

      // Set metadata
      this.setMetadata(options);

      this.emitProgress('compressing', 90, 'Compressing PDF...');

      // Generate output
      const output = this.pdf.output('arraybuffer');

      const generateTime = stopMeasure();
      logger.info(`PDF generated in ${generateTime.toFixed(2)}ms, size: ${output.byteLength} bytes`);

      this.emitProgress('complete', 100, 'PDF generation complete');
      eventBus.publish(EVENTS.EXPORT_COMPLETE, {
        size: output.byteLength,
        pageCount: pages.length,
      });

      return output;
    } catch (error) {
      logger.error('PDF generation failed', error);
      eventBus.publish(EVENTS.EXPORT_ERROR, { error });
      throw error;
    } finally {
      this.pdf = null;
    }
  }

  /**
   * Add a page as an image to the PDF
   */
  private async addPageAsImage(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<void> {
    if (!this.pdf) return;

    // Convert canvas to JPEG data URL for compression
    const imageData = canvas.toDataURL('image/jpeg', EXPORT_CONFIG.COMPRESSION_QUALITY);

    // Add image to PDF
    this.pdf.addImage(imageData, 'JPEG', 0, 0, width, height);
  }

  /**
   * Add invisible text layer for searchability
   */
  private addTextLayer(edits: Edit[], _pageHeight: number): void {
    if (!this.pdf || edits.length === 0) return;

    for (const edit of edits) {
      if (edit.status !== 'applied' || !edit.newText) continue;

      // Set font properties
      const style = edit.newStyle;
      this.pdf.setFontSize(style.fontSize);
      this.pdf.setTextColor(0, 0, 0, 0); // Invisible text

      // Convert coordinates (jsPDF uses top-left origin like canvas)
      const x = edit.position.x;
      const y = edit.position.y;

      // Add text (invisible, but searchable)
      this.pdf.text(edit.newText, x, y, {
        baseline: 'top',
      });
    }
  }

  /**
   * Set PDF metadata
   */
  private setMetadata(_options: ExportOptions): void {
    if (!this.pdf) return;

    const properties = {
      title: 'Edited PDF Document',
      creator: 'PDF Editor WASM',
      producer: 'PDF Editor WASM v1.0',
    };

    this.pdf.setProperties(properties);
  }

  /**
   * Emit progress event
   */
  private emitProgress(
    stage: ExportProgress['stage'],
    progress: number,
    message: string
  ): void {
    eventBus.publish(EVENTS.EXPORT_PROGRESS, { stage, progress, message });
  }

  /**
   * Validate generated PDF
   */
  validatePDF(buffer: ArrayBuffer): { isValid: boolean; error?: string } {
    // Check PDF header
    const header = new Uint8Array(buffer.slice(0, 5));
    const headerString = String.fromCharCode(...header);

    if (headerString !== '%PDF-') {
      return { isValid: false, error: 'Invalid PDF header' };
    }

    // Check file size
    if (buffer.byteLength < 100) {
      return { isValid: false, error: 'PDF file too small' };
    }

    return { isValid: true };
  }
}

// Export singleton instance
let pdfGeneratorInstance: PDFGenerator | null = null;

export function getPDFGenerator(): PDFGenerator {
  if (!pdfGeneratorInstance) {
    pdfGeneratorInstance = new PDFGenerator();
  }
  return pdfGeneratorInstance;
}
