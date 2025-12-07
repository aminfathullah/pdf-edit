/**
 * PDF Editor WASM - Constants
 * 
 * Application-wide constants and configuration values.
 */

// ============================================
// Application Constants
// ============================================

export const APP_NAME = 'PDF Editor WASM';
export const APP_VERSION = '1.0.0';

// ============================================
// File Constraints
// ============================================

export const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB for MVP
  MAX_FILE_SIZE_FUTURE: 500 * 1024 * 1024, // 500MB for future
  ALLOWED_MIME_TYPES: ['application/pdf'],
  PDF_MAGIC_BYTES: '%PDF-',
} as const;

// ============================================
// Rendering Constants
// ============================================

export const RENDERING = {
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 4.0,
  DEFAULT_ZOOM: 1.0,
  ZOOM_STEP: 0.25,
  ZOOM_LEVELS: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0],
  DEFAULT_DPI: 96,
  HIGH_DPI: 150,
  CACHE_SIZE: 10,
  MAX_CANVAS_SIZE: 16384, // Maximum canvas dimension
} as const;

// ============================================
// Performance Targets
// ============================================

export const PERFORMANCE_TARGETS = {
  PDF_RENDER_LATENCY_MS: 500,
  OCR_PER_PAGE_MS: 2000,
  TEXT_INPUT_LAG_MS: 50,
  ZOOM_TRANSITION_MS: 100,
  MEMORY_FOOTPRINT_MB: 200,
  STYLE_DETECTION_MS: 100,
  TEXT_ERASURE_MS: 100,
  PDF_GENERATION_PER_PAGE_MS: 2000,
} as const;

// ============================================
// OCR Constants
// ============================================

export const OCR_CONFIG = {
  DEFAULT_LANGUAGE: 'eng',
  SUPPORTED_LANGUAGES: ['eng', 'spa', 'fra', 'deu'],
  CONFIDENCE_THRESHOLD: 0.6, // Filter out OCR results below this threshold
  CONFIDENCE_THRESHOLD_MIN: 0.0,
  CONFIDENCE_THRESHOLD_MAX: 1.0,
  WORKER_POOL_SIZE: 2,
  MAX_RETRIES: 3,
} as const;

// ============================================
// Style Detection Constants
// ============================================

export const STYLE_DETECTION = {
  DEFAULT_FONT_FAMILY: 'Arial, sans-serif',
  DEFAULT_FONT_SIZE: 12,
  DEFAULT_COLOR: '#000000',
  FONT_SIZE_TOLERANCE: 2,
  COLOR_TOLERANCE: 5, // RGB variance percentage
  BOLD_DENSITY_THRESHOLD: 0.3,
  SERIF_DETECTION_THRESHOLD: 0.1,
  SAMPLE_PIXELS: 10,
} as const;

// ============================================
// Edit Constants
// ============================================

export const EDIT_CONFIG = {
  MAX_HISTORY_SIZE: 50,
  UNDO_DEBOUNCE_MS: 100,
  TEXT_BLOCK_PADDING: 2,
  MASK_BLUR_RADIUS: 1,
  OVERFLOW_ELLIPSIS: '...',
} as const;

// ============================================
// Export Constants
// ============================================

export const EXPORT_CONFIG = {
  OUTPUT_FILE_SUFFIX: '_edited',
  MAX_FILE_SIZE_INCREASE: 1.2, // 120% of original
  COMPRESSION_QUALITY: 0.8,
  FONT_SUBSET_THRESHOLD: 10 * 1024, // 10KB
} as const;

// ============================================
// UI Constants
// ============================================

export const UI = {
  TOOLBAR_HEIGHT: 60,
  SIDEBAR_WIDTH: 250,
  EDIT_BOX_MIN_WIDTH: 100,
  EDIT_BOX_MIN_HEIGHT: 24,
  TOOLTIP_DELAY_MS: 500,
  ANIMATION_DURATION_MS: 200,
  SCROLL_DEBOUNCE_MS: 100,
} as const;

// ============================================
// Keyboard Shortcuts
// ============================================

export const KEYBOARD_SHORTCUTS = {
  UNDO: { key: 'z', ctrlKey: true },
  REDO: { key: 'y', ctrlKey: true },
  REDO_ALT: { key: 'z', ctrlKey: true, shiftKey: true },
  SAVE: { key: 's', ctrlKey: true },
  ZOOM_IN: { key: '+', ctrlKey: true },
  ZOOM_OUT: { key: '-', ctrlKey: true },
  ZOOM_RESET: { key: '0', ctrlKey: true },
  ESCAPE: { key: 'Escape' },
  CONFIRM: { key: 'Enter', ctrlKey: true },
} as const;

// ============================================
// Event Names
// ============================================

export const EVENTS = {
  // Document events
  DOCUMENT_LOADED: 'document-loaded',
  DOCUMENT_ERROR: 'document-error',
  
  // Rendering events
  PAGE_RENDERED: 'page-rendered',
  RENDER_ERROR: 'render-error',
  
  // Text detection events
  TEXT_DETECTED: 'text-detected',
  OCR_PROGRESS: 'ocr-progress',
  OCR_COMPLETE: 'ocr-complete',
  OCR_ERROR: 'ocr-error',
  
  // Style detection events
  STYLE_DETECTED: 'style-detected',
  
  // Edit events
  TEXT_SELECTED: 'text-selected',
  EDIT_STARTED: 'edit-started',
  EDIT_CONFIRMED: 'edit-confirmed',
  EDIT_CANCELLED: 'edit-cancelled',
  EDIT_UNDONE: 'edit-undone',
  EDIT_REDONE: 'edit-redone',
  
  // Export events
  EXPORT_STARTED: 'export-started',
  EXPORT_PROGRESS: 'export-progress',
  EXPORT_COMPLETE: 'export-complete',
  EXPORT_ERROR: 'export-error',
  // Annotation/Form events
  ANNOTATIONS_PRESERVED: 'annotations-preserved',
  FORM_FIELDS_PRESERVED: 'form-fields-preserved',
  
  // General events
  ERROR: 'error',
  WARNING: 'warning',
} as const;

// ============================================
// Error Codes
// ============================================

export const ERROR_CODES = {
  // File errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  CORRUPTED_PDF: 'CORRUPTED_PDF',
  
  // Rendering errors
  RENDER_FAILED: 'RENDER_FAILED',
  CANVAS_ERROR: 'CANVAS_ERROR',
  
  // OCR errors
  OCR_INIT_FAILED: 'OCR_INIT_FAILED',
  OCR_PROCESSING_FAILED: 'OCR_PROCESSING_FAILED',
  LANGUAGE_NOT_SUPPORTED: 'LANGUAGE_NOT_SUPPORTED',
  
  // Edit errors
  EDIT_FAILED: 'EDIT_FAILED',
  STYLE_DETECTION_FAILED: 'STYLE_DETECTION_FAILED',
  
  // Export errors
  EXPORT_FAILED: 'EXPORT_FAILED',
  FONT_EMBED_FAILED: 'FONT_EMBED_FAILED',
  
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// ============================================
// Default Values
// ============================================

export const DEFAULTS = {
  TEXT_STYLE: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 12,
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
    textDecoration: 'none' as const,
    color: '#000000',
    backgroundColor: 'transparent',
    lineHeight: 1.2,
  },
  BACKGROUND: {
    color: '#ffffff',
    type: 'solid' as const,
    confidence: 1.0,
  },
  VIEWPORT: {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    currentPage: 1,
  },
} as const;
