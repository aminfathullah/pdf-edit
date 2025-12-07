/**
 * PDF Editor WASM - Core Type Definitions
 * 
 * This file contains all the TypeScript interfaces and types
 * used throughout the PDF Editor application.
 */

// ============================================
// Document Types
// ============================================

export interface PDFDocument {
  id: string;
  filename: string;
  originalBuffer: ArrayBuffer;
  pageCount: number;
  metadata: DocumentMetadata;
  pages: Page[];
  edits: Edit[];
  createdAt: Date;
  lastModified: Date;
}

export interface DocumentMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  producer: string;
  creationDate: Date | null;
  modificationDate: Date | null;
}

export interface Page {
  number: number;
  width: number;
  height: number;
  rotation: PageRotation;
  canvas: HTMLCanvasElement | null;
  textBlocks: TextBlock[];
  edits: Edit[];
  metadata: PageMetadata;
}

export interface PageMetadata {
  isScanned: boolean;
  ocrProcessed: boolean;
  editCount: number;
}

export type PageRotation = 0 | 90 | 180 | 270;

// ============================================
// Text & Style Types
// ============================================

export interface TextBlock {
  id: string;
  text: string;
  boxes: CharBox[];
  style: TextStyle;
  source: TextSource;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export type TextSource = 'digital' | 'ocr';

export interface CharBox {
  char: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  baseline: number;
  fontName?: string;
  fontSize?: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  textDecoration: TextDecoration;
  color: string;
  backgroundColor: string;
  lineHeight: number;
  letterSpacing?: number;
}

export type FontWeight = 'normal' | 'bold' | number;
export type FontStyle = 'normal' | 'italic';
export type TextDecoration = 'none' | 'underline' | 'line-through';

export interface StyleConfidence {
  font: number;
  size: number;
  color: number;
  overall: number;
}

export enum FontFamily {
  SERIF = 'serif',
  SANS_SERIF = 'sans-serif',
  MONOSPACE = 'monospace',
  SCRIPT = 'script',
}

// ============================================
// Edit Types
// ============================================

export interface Edit {
  id: string;
  pageNumber: number;
  timestamp: Date;
  type: EditType;
  originalText: string;
  newText: string;
  position: Position;
  originalStyle: TextStyle;
  newStyle: TextStyle;
  boundingBox: BoundingBox;
  erasureArea: BoundingBox;
  status: EditStatus;
}

export type EditType = 'text-replace' | 'text-add' | 'text-delete';
export type EditStatus = 'pending' | 'applied' | 'undone';

export interface EditOperation {
  id: string;
  pageNum: number;
  blockId: string;
  originalText: string;
  newText: string;
  originalStyle: TextStyle;
  newStyle: TextStyle;
  timestamp: Date;
}

export interface EditBox {
  id: string;
  element: HTMLTextAreaElement;
  originalText: string;
  newText: string;
  style: TextStyle;
  boundingBox: BoundingBox;
}

// ============================================
// Geometry Types
// ============================================

export interface Position {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageDimensions {
  width: number;
  height: number;
  rotation: PageRotation;
}

// ============================================
// OCR Types
// ============================================

export interface OCRResult {
  text: string;
  boxes: OCRBox[];
  confidence: number;
  processingTime: number;
  language: string;
}

export interface OCRBox {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRProgress {
  status: OCRStatus;
  progress: number;
  message?: string;
}

export type OCRStatus = 'idle' | 'loading' | 'processing' | 'complete' | 'error';

// ============================================
// Background Detection Types
// ============================================

export interface Background {
  color: string;
  type: BackgroundType;
  confidence: number;
}

export type BackgroundType = 'solid' | 'gradient' | 'pattern' | 'image';

// ============================================
// Rendering Types
// ============================================

export interface RenderConfig {
  maxPages?: number;
  cacheSize?: number;
  devicePixelRatio?: number;
  quality?: RenderQuality;
}

export type RenderQuality = 'low' | 'medium' | 'high';

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  currentPage: number;
}

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

export interface FileValidationResult extends ValidationResult {
  fileSize: number;
  mimeType: string;
  filename: string;
}

// ============================================
// Event Types
// ============================================

export type EventCallback<T = unknown> = (data: T) => void;

export interface PDFLoadedEvent {
  documentId: string;
  pageCount: number;
  filename: string;
}

export interface PageRenderedEvent {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  renderTime: number;
}

export interface TextDetectedEvent {
  pageNumber: number;
  blocks: TextBlock[];
}

export interface TextSelectedEvent {
  blockId: string;
  text: string;
  style: TextStyle;
  position: Position;
}

export interface EditEvent {
  editId: string;
  type: 'started' | 'confirmed' | 'cancelled' | 'undone' | 'redone';
  edit?: Edit;
}

export interface ErrorEvent {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Export Types
// ============================================

export interface ExportOptions {
  filename?: string;
  quality?: 'low' | 'medium' | 'high';
  preserveText?: boolean;
  embedFonts?: boolean;
  /** Map of font alias to base64 font data for embedding */
  embeddedFonts?: Record<string, string>;
  /** Preserve page annotations (if provided) */
  preserveAnnotations?: boolean;
  /** Preserve interactive form fields (read-only for export) */
  preserveFormFields?: boolean;
}

export interface ExportProgress {
  stage: ExportStage;
  progress: number;
  message?: string;
}

export type ExportStage = 'preparing' | 'generating' | 'compressing' | 'complete';

// ============================================
// UI State Types
// ============================================

export interface EditorState {
  document: PDFDocument | null;
  currentPage: number;
  zoom: number;
  isLoading: boolean;
  error: string | null;
  selectedBlock: TextBlock | null;
  editMode: boolean;
  viewMode: ViewMode;
}

export type ViewMode = 'single' | 'continuous' | 'side-by-side';

export interface ToolbarState {
  activeTool: ToolType;
  zoomLevel: number;
  canUndo: boolean;
  canRedo: boolean;
}

export type ToolType = 'select' | 'edit' | 'pan' | 'zoom';
