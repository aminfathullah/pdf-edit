/**
 * Validators
 * 
 * Input validation utilities for the PDF Editor.
 */

import { FILE_CONSTRAINTS } from '@core/constants';
import type { FileValidationResult, ValidationResult } from '@core/types';

/**
 * Validate a file for PDF upload
 */
export function validatePDFFile(file: File): FileValidationResult {
  const result: FileValidationResult = {
    isValid: true,
    fileSize: file.size,
    mimeType: file.type,
    filename: file.name,
  };

  // Check file size
  if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
    return {
      ...result,
      isValid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed (${formatFileSize(FILE_CONSTRAINTS.MAX_FILE_SIZE)})`,
    };
  }

  // Check MIME type
  if (!(FILE_CONSTRAINTS.ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      ...result,
      isValid: false,
      error: `Invalid file type: ${file.type}. Only PDF files are allowed.`,
    };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return {
      ...result,
      isValid: false,
      error: 'File must have a .pdf extension',
    };
  }

  return result;
}

/**
 * Validate PDF magic bytes
 */
export async function validatePDFMagicBytes(file: File): Promise<ValidationResult> {
  try {
    const buffer = await file.slice(0, 5).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const header = String.fromCharCode(...bytes);

    if (header !== FILE_CONSTRAINTS.PDF_MAGIC_BYTES) {
      return {
        isValid: false,
        error: 'File does not appear to be a valid PDF (invalid header)',
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to read file header',
      details: { error },
    };
  }
}

/**
 * Validate text input for editing
 */
export function validateTextInput(text: string): ValidationResult {
  // Prevent XSS by checking for script tags
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        error: 'Text contains potentially unsafe content',
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate color string
 */
export function validateColor(color: string): ValidationResult {
  // Check hex color
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (hexPattern.test(color)) {
    return { isValid: true };
  }

  // Check rgb/rgba
  const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
  if (rgbPattern.test(color)) {
    return { isValid: true };
  }

  // Check named colors (simplified)
  const namedColors = [
    'black', 'white', 'red', 'green', 'blue', 'yellow', 
    'cyan', 'magenta', 'gray', 'grey', 'transparent'
  ];
  if (namedColors.includes(color.toLowerCase())) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: `Invalid color format: ${color}`,
  };
}

/**
 * Validate font size
 */
export function validateFontSize(size: number): ValidationResult {
  if (typeof size !== 'number' || isNaN(size)) {
    return {
      isValid: false,
      error: 'Font size must be a number',
    };
  }

  if (size < 1 || size > 500) {
    return {
      isValid: false,
      error: 'Font size must be between 1 and 500',
    };
  }

  return { isValid: true };
}

/**
 * Validate page number
 */
export function validatePageNumber(pageNum: number, totalPages: number): ValidationResult {
  if (!Number.isInteger(pageNum)) {
    return {
      isValid: false,
      error: 'Page number must be an integer',
    };
  }

  if (pageNum < 1 || pageNum > totalPages) {
    return {
      isValid: false,
      error: `Page number must be between 1 and ${totalPages}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate zoom level
 */
export function validateZoomLevel(zoom: number): ValidationResult {
  if (typeof zoom !== 'number' || isNaN(zoom)) {
    return {
      isValid: false,
      error: 'Zoom level must be a number',
    };
  }

  if (zoom < 0.1 || zoom > 10) {
    return {
      isValid: false,
      error: 'Zoom level must be between 0.1 and 10',
    };
  }

  return { isValid: true };
}

// ============================================
// Helper Functions
// ============================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
