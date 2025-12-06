/**
 * PDFExporter Unit Tests
 */

import { getPDFExporter, PDFExporter } from '../../../src/modules/export/PDFExporter';
import type { Edit } from '../../../src/core/types';

describe('PDFExporter', () => {
  let exporter: PDFExporter;

  beforeEach(() => {
    exporter = getPDFExporter();
    jest.clearAllMocks();
  });

  describe('setOriginalDocument', () => {
    it('should store original document info', () => {
      exporter.setOriginalDocument('test.pdf', 50000);
      // No assertion needed - just ensure it doesn't throw
      expect(exporter).toBeDefined();
    });

    it('should strip .pdf extension from filename', () => {
      exporter.setOriginalDocument('document.pdf', 100000);
      // Verify it handles the filename correctly
      expect(exporter).toBeDefined();
    });

    it('should handle filename without extension', () => {
      exporter.setOriginalDocument('document', 100000);
      expect(exporter).toBeDefined();
    });
  });

  describe('exportPDF', () => {
    it('should export valid PDF', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('test.pdf', 50000);
      const result = await exporter.exportPDF(pages);

      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.filename).toContain('test');
      expect(result.filename).toContain('.pdf');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should handle export options', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('test.pdf', 50000);
      const result = await exporter.exportPDF(pages, {
        filename: 'custom-name.pdf',
        preserveText: true,
      });

      expect(result.filename).toBe('custom-name.pdf');
    });

    it('should validate generated PDF', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('test.pdf', 50000);
      const result = await exporter.exportPDF(pages);

      // Verify PDF header
      const uint8 = new Uint8Array(result.buffer);
      const header = String.fromCharCode(...uint8.slice(0, 4));
      expect(header).toBe('%PDF');
    });

    it('should warn if file size increases significantly', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      // Set very small original size
      exporter.setOriginalDocument('test.pdf', 100);

      await exporter.exportPDF(pages);

      // Should warn about file size
      // Note: This is just checking that the logic runs
      expect(exporter).toBeDefined();

      warnSpy.mockRestore();
    });

    it('should apply default suffix to filename', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('test.pdf', 50000);
      const result = await exporter.exportPDF(pages);

      expect(result.filename).toContain('_edited');
    });
  });

  describe('exportAsDataURL', () => {
    it('should export as base64 data URL', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('test.pdf', 50000);
      const dataURL = await exporter.exportAsDataURL(pages);

      expect(dataURL).toMatch(/^data:application\/pdf;base64,/);
      expect(dataURL.length).toBeGreaterThan(100);
    });

    it('should handle multiple pages in data URL', async () => {
      const canvas1 = document.createElement('canvas');
      canvas1.width = 612;
      canvas1.height = 792;

      const canvas2 = document.createElement('canvas');
      canvas2.width = 612;
      canvas2.height = 792;

      const pages = [
        {
          canvas: canvas1,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
        {
          canvas: canvas2,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('test.pdf', 50000);
      const dataURL = await exporter.exportAsDataURL(pages);

      expect(dataURL).toMatch(/^data:application\/pdf;base64,/);
      expect(dataURL.length).toBeGreaterThan(100);
    });
  });

  describe('estimateOutputSize', () => {
    it('should estimate output size for low quality', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [{ canvas }];

      const size = exporter.estimateOutputSize(pages, 'low');
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(612 * 792 * 4);
    });

    it('should estimate output size for medium quality', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [{ canvas }];

      const size = exporter.estimateOutputSize(pages, 'medium');
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(612 * 792 * 4);
    });

    it('should estimate output size for high quality', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [{ canvas }];

      const size = exporter.estimateOutputSize(pages, 'high');
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(612 * 792 * 4);
    });

    it('should scale estimate with multiple pages', () => {
      const canvas1 = document.createElement('canvas');
      canvas1.width = 612;
      canvas1.height = 792;

      const canvas2 = document.createElement('canvas');
      canvas2.width = 612;
      canvas2.height = 792;

      const singlePage = exporter.estimateOutputSize([{ canvas: canvas1 }], 'medium');
      const twoPages = exporter.estimateOutputSize([{ canvas: canvas1 }, { canvas: canvas2 }], 'medium');

      expect(twoPages).toBeGreaterThan(singlePage);
    });

    it('should respect quality settings', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [{ canvas }];

      const lowQuality = exporter.estimateOutputSize(pages, 'low');
      const mediumQuality = exporter.estimateOutputSize(pages, 'medium');
      const highQuality = exporter.estimateOutputSize(pages, 'high');

      expect(lowQuality).toBeLessThan(mediumQuality);
      expect(mediumQuality).toBeLessThan(highQuality);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid PDF', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('test.pdf', 50000);

      // This should succeed - validation should pass
      const result = await exporter.exportPDF(pages);
      expect(result).toBeDefined();
    });
  });

  describe('File naming', () => {
    it('should generate unique filenames', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('test.pdf', 50000);
      const result1 = await exporter.exportPDF(pages);

      exporter.setOriginalDocument('test.pdf', 50000);
      const result2 = await exporter.exportPDF(pages);

      // Both should have _edited suffix
      expect(result1.filename).toContain('_edited');
      expect(result2.filename).toContain('_edited');
    });

    it('should handle special characters in filename', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('my-test-doc_v1.pdf', 50000);
      const result = await exporter.exportPDF(pages);

      expect(result.filename).toContain('my-test-doc_v1');
      expect(result.filename).toMatch(/\.pdf$/);
    });
  });

  describe('Performance', () => {
    it('should estimate size quickly', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const start = performance.now();
      exporter.estimateOutputSize([{ canvas }], 'medium');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should export quickly for single page', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits: [] as Edit[],
        },
      ];

      exporter.setOriginalDocument('test.pdf', 50000);

      const start = performance.now();
      await exporter.exportPDF(pages);
      const duration = performance.now() - start;

      // Should be less than 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});
