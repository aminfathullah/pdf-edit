/**
 * Tests for validation utility functions
 */

import {
  validatePDFFile,
  validateTextInput,
  validateColor,
  validateFontSize,
  validatePageNumber,
  validateZoomLevel,
} from '@utils/validators';

// Mock File class for testing
class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(name: string, size: number, type: string) {
    this.name = name;
    this.size = size;
    this.type = type;
  }
}

describe('Validators', () => {
  describe('validatePDFFile', () => {
    it('should accept valid PDF file', () => {
      const file = new MockFile('test.pdf', 1024, 'application/pdf') as unknown as File;
      const result = validatePDFFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-PDF file type', () => {
      const file = new MockFile('test.txt', 1024, 'text/plain') as unknown as File;
      const result = validatePDFFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject file exceeding max size', () => {
      // 100MB file (exceeds 50MB limit)
      const file = new MockFile('test.pdf', 100 * 1024 * 1024, 'application/pdf') as unknown as File;
      const result = validatePDFFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should reject file without .pdf extension', () => {
      const file = new MockFile('test.doc', 1024, 'application/pdf') as unknown as File;
      const result = validatePDFFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('.pdf extension');
    });
  });

  describe('validateTextInput', () => {
    it('should accept valid text', () => {
      const result = validateTextInput('Hello World');
      
      expect(result.isValid).toBe(true);
    });

    it('should accept empty text (no security issue)', () => {
      const result = validateTextInput('');
      
      // Empty text is valid (just no security issue), actual emptiness check is app-level
      expect(result.isValid).toBe(true);
    });

    it('should reject text with script tags', () => {
      const result = validateTextInput('<script>alert("xss")</script>');
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateColor', () => {
    it('should accept valid hex colors', () => {
      expect(validateColor('#ff0000').isValid).toBe(true);
      expect(validateColor('#00ff00').isValid).toBe(true);
      expect(validateColor('#0000ff').isValid).toBe(true);
      expect(validateColor('#ffffff').isValid).toBe(true);
      expect(validateColor('#000000').isValid).toBe(true);
    });

    it('should accept shorthand hex colors', () => {
      expect(validateColor('#f00').isValid).toBe(true);
      expect(validateColor('#0f0').isValid).toBe(true);
    });

    it('should accept rgb colors', () => {
      expect(validateColor('rgb(255, 0, 0)').isValid).toBe(true);
      expect(validateColor('rgb(0, 255, 0)').isValid).toBe(true);
    });

    it('should accept rgba colors', () => {
      expect(validateColor('rgba(255, 0, 0, 0.5)').isValid).toBe(true);
    });

    it('should reject invalid colors', () => {
      expect(validateColor('invalid').isValid).toBe(false);
      expect(validateColor('#gg0000').isValid).toBe(false);
    });
  });

  describe('validateFontSize', () => {
    it('should accept valid font sizes', () => {
      expect(validateFontSize(12).isValid).toBe(true);
      expect(validateFontSize(24).isValid).toBe(true);
      expect(validateFontSize(48).isValid).toBe(true);
    });

    it('should reject font sizes below minimum (less than 1)', () => {
      expect(validateFontSize(0).isValid).toBe(false);
      expect(validateFontSize(-12).isValid).toBe(false);
    });

    it('should reject font sizes above maximum (greater than 500)', () => {
      expect(validateFontSize(501).isValid).toBe(false);
    });

    it('should accept edge cases', () => {
      expect(validateFontSize(1).isValid).toBe(true);
      expect(validateFontSize(500).isValid).toBe(true);
    });
  });

  describe('validatePageNumber', () => {
    it('should accept valid page numbers', () => {
      expect(validatePageNumber(1, 10).isValid).toBe(true);
      expect(validatePageNumber(5, 10).isValid).toBe(true);
      expect(validatePageNumber(10, 10).isValid).toBe(true);
    });

    it('should reject page numbers below 1', () => {
      expect(validatePageNumber(0, 10).isValid).toBe(false);
      expect(validatePageNumber(-1, 10).isValid).toBe(false);
    });

    it('should reject page numbers exceeding total', () => {
      expect(validatePageNumber(11, 10).isValid).toBe(false);
    });
  });

  describe('validateZoomLevel', () => {
    it('should accept valid zoom levels', () => {
      expect(validateZoomLevel(0.5).isValid).toBe(true);
      expect(validateZoomLevel(1).isValid).toBe(true);
      expect(validateZoomLevel(2).isValid).toBe(true);
      expect(validateZoomLevel(4).isValid).toBe(true);
    });

    it('should accept edge case zoom levels', () => {
      expect(validateZoomLevel(0.1).isValid).toBe(true);
      expect(validateZoomLevel(10).isValid).toBe(true);
    });

    it('should reject zoom levels below minimum (less than 0.1)', () => {
      expect(validateZoomLevel(0.05).isValid).toBe(false);
    });

    it('should reject zoom levels above maximum (greater than 10)', () => {
      expect(validateZoomLevel(11).isValid).toBe(false);
    });
  });
});
