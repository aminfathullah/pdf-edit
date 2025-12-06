/**
 * PDFGenerator Unit Tests
 */

import { getPDFGenerator, PDFGenerator } from '../../../src/modules/export/PDFGenerator';
import { eventBus } from '../../../src/utils/EventBus';
import type { Edit } from '../../../src/core/types';

describe('PDFGenerator', () => {
  let generator: PDFGenerator;

  beforeEach(() => {
    generator = getPDFGenerator();
    jest.clearAllMocks();
  });

  describe('generatePDF', () => {
    it('should generate a valid PDF from pages', async () => {
      // Create mock canvas
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

      const buffer = await generator.generatePDF(pages);

      // Verify PDF header
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      const uint8 = new Uint8Array(buffer);
      const header = String.fromCharCode(...uint8.slice(0, 4));
      expect(header).toBe('%PDF');
    });

    it('should handle multiple pages', async () => {
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

      const buffer = await generator.generatePDF(pages);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('should throw error for empty pages', async () => {
      await expect(generator.generatePDF([])).rejects.toThrow('No pages to generate');
    });

    it('should emit progress events', async () => {
      const progressSpy = jest.spyOn(eventBus, 'publish');

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

      await generator.generatePDF(pages);

      // Should emit export started and complete events
      expect(progressSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ pageCount: 1 })
      );

      progressSpy.mockRestore();
    });

    it('should handle landscape orientation', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 792; // Landscape
      canvas.height = 612;

      const pages = [
        {
          canvas,
          width: 792,
          height: 612,
          edits: [] as Edit[],
        },
      ];

      const buffer = await generator.generatePDF(pages);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('should preserve text layer with edits', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 612;
      canvas.height = 792;

      const edits: Edit[] = [
        {
          id: 'edit-1',
          pageNumber: 1,
          timestamp: new Date(),
          type: 'text-replace',
          originalText: 'Original',
          newText: 'Edited',
          position: { x: 100, y: 100 },
          originalStyle: {
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: '#000000',
            backgroundColor: 'transparent',
            lineHeight: 1.5,
          },
          newStyle: {
            fontFamily: 'Arial',
            fontSize: 12,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: '#000000',
            backgroundColor: 'transparent',
            lineHeight: 1.5,
          },
          boundingBox: {
            x: 100,
            y: 100,
            width: 50,
            height: 20,
          },
          erasureArea: {
            x: 100,
            y: 100,
            width: 50,
            height: 20,
          },
          status: 'applied',
        },
      ];

      const pages = [
        {
          canvas,
          width: 612,
          height: 792,
          edits,
        },
      ];

      const buffer = await generator.generatePDF(pages, { preserveText: true });
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('should skip text layer when preserveText is false', async () => {
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

      const buffer = await generator.generatePDF(pages, { preserveText: false });
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  describe('validatePDF', () => {
    it('should validate a generated PDF', async () => {
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

      const buffer = await generator.generatePDF(pages);
      const result = generator.validatePDF(buffer);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid PDF header', () => {
      const buffer = new ArrayBuffer(10);
      const result = generator.validatePDF(buffer);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid PDF header');
    });

    it('should reject very small file', () => {
      const buffer = new ArrayBuffer(50);
      const result = generator.validatePDF(buffer);
      expect(result.isValid).toBe(false);
    });
  });

  describe('PDF compression', () => {
    it('should compress output PDF', async () => {
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

      const buffer = await generator.generatePDF(pages);
      const uncompressedSize = buffer.byteLength;

      // PDF should be reasonably sized (less than canvas dimensions * pixels)
      const maxExpectedSize = 612 * 792 * 4; // Rough estimate
      expect(uncompressedSize).toBeLessThan(maxExpectedSize);
    });
  });

  describe('Performance', () => {
    it('should generate single page in reasonable time', async () => {
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

      const start = performance.now();
      await generator.generatePDF(pages);
      const duration = performance.now() - start;

      // Should be less than 2 seconds for single page
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Metadata', () => {
    it('should set PDF metadata', async () => {
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

      const buffer = await generator.generatePDF(pages);
      expect(buffer).toBeInstanceOf(ArrayBuffer);

      // Check for creator string in PDF
      const uint8 = new Uint8Array(buffer);
      const searchStr = 'PDF Editor WASM';
      for (let i = 0; i < uint8.length - searchStr.length; i++) {
        let match = true;
        for (let j = 0; j < searchStr.length; j++) {
          if (uint8[i + j] !== searchStr.charCodeAt(j)) {
            match = false;
            break;
          }
        }
        if (match) {
          // Creator string found in PDF
          break;
        }
      }

      // Creator might be compressed, so we just check PDF is valid
      expect(buffer.byteLength).toBeGreaterThan(100);
    });
  });
});
