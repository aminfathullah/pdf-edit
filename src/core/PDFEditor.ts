/**
 * PDFEditor - Main Application Class
 * 
 * Coordinates all modules and provides the main API for the PDF editor.
 */

import type {
  PDFDocument,
  TextBlock,
  TextStyle,
  Edit,
  ExportOptions,
  ViewportState,
  BoundingBox,
} from './types';
import type { ReflowResult } from '@modules/reflow/ReflowEngine';
import { EVENTS, DEFAULTS } from './constants';
import { RenderEngine } from '@modules/rendering/RenderEngine';
import { CanvasManager } from '@modules/rendering/CanvasManager';
import { TextDetector } from '@modules/detection/TextDetector';
import { OCRService } from '@modules/detection/OCRService';
import { StyleDetector } from '@modules/detection/StyleDetector';
import { EditManager } from '@modules/editing/EditManager';
import { BackgroundDetector } from '@modules/erasure/BackgroundDetector';
import { TextEraser } from '@modules/erasure/TextEraser';
import { ReflowEngine } from '@modules/reflow/ReflowEngine';
import { PDFExporter } from '@modules/export/PDFExporter';
import { eventBus, EventBus } from '@utils/EventBus';
import { validatePDFFile, validatePDFMagicBytes } from '@utils/validators';
import { generateId, formatFileSize } from '@utils/helpers';
import { createLogger } from '@utils/logger';
import { performanceMonitor } from '@utils/performance';

const logger = createLogger('PDFEditor');

export interface PDFEditorConfig {
  container?: HTMLElement;
  autoInitialize?: boolean;
}

export class PDFEditor {
  // Services
  private renderEngine: RenderEngine;
  private canvasManager: CanvasManager | null = null;
  private textDetector: TextDetector;
  private ocrService: OCRService;
  private styleDetector: StyleDetector;
  private editManager: EditManager;
  private backgroundDetector: BackgroundDetector;
  private textEraser: TextEraser;
  private reflowEngine: ReflowEngine;
  private pdfExporter: PDFExporter;

  // State
  private document: PDFDocument | null = null;
  private currentPage = 1;
  private isInitialized = false;
  private container: HTMLElement | null = null;

  // Event bus (public for external subscriptions)
  public events: EventBus = eventBus;

  constructor(config: PDFEditorConfig = {}) {
    // Initialize services
    this.renderEngine = new RenderEngine();
    this.textDetector = new TextDetector();
    this.ocrService = new OCRService();
    this.styleDetector = new StyleDetector();
    this.editManager = new EditManager();
    this.backgroundDetector = new BackgroundDetector();
    this.textEraser = new TextEraser();
    this.reflowEngine = new ReflowEngine();
    this.pdfExporter = new PDFExporter();

    // Setup container if provided
    if (config.container) {
      this.container = config.container;
      this.canvasManager = new CanvasManager(config.container);
    }

    // Auto-initialize if requested
    if (config.autoInitialize) {
      this.initialize().catch((err) => {
        logger.error('Auto-initialization failed', err);
      });
    }

    logger.info('PDFEditor instance created');
  }

  /**
   * Initialize the editor (async services)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const stopMeasure = performanceMonitor.startMeasure('editor-init');

    try {
      // Initialize OCR service (WASM loading)
      await this.ocrService.initialize();

      // Setup internal event handlers
      this.setupEventHandlers();

      this.isInitialized = true;

      stopMeasure();
      logger.info('PDFEditor initialized successfully');
    } catch (error) {
      logger.error('PDFEditor initialization failed', error);
      throw error;
    }
  }

  /**
   * Set the container element for rendering
   */
  setContainer(container: HTMLElement): void {
    this.container = container;
    if (this.canvasManager) {
      this.canvasManager.destroy();
    }
    this.canvasManager = new CanvasManager(container);
  }

  /**
   * Load a PDF file
   */
  async loadFile(file: File): Promise<PDFDocument> {
    logger.info(`Loading file: ${file.name} (${formatFileSize(file.size)})`);

    // Validate file
    const validation = validatePDFFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Validate magic bytes
    const magicValidation = await validatePDFMagicBytes(file);
    if (!magicValidation.isValid) {
      throw new Error(magicValidation.error);
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF
    return this.loadBuffer(arrayBuffer, file.name, file.size);
  }

  /**
   * Load a PDF from ArrayBuffer
   */
  async loadBuffer(
    buffer: ArrayBuffer,
    filename: string = 'document.pdf',
    originalSize?: number
  ): Promise<PDFDocument> {
    const stopMeasure = performanceMonitor.startMeasure('load-pdf');

    try {
      // Load into render engine
      const { pageCount } = await this.renderEngine.loadPDF(buffer);

      // Set PDF for text detector
      const pdfProxy = this.renderEngine.getPDFDocument();
      if (pdfProxy) {
        this.textDetector.setPDF(pdfProxy);
      }

      // Get metadata
      const metadata = await this.renderEngine.getMetadata();

      // Create document object
      this.document = {
        id: generateId('doc'),
        filename,
        originalBuffer: buffer,
        pageCount,
        metadata: {
          title: metadata.title || filename,
          author: metadata.author || '',
          subject: metadata.subject || '',
          keywords: metadata.keywords ? metadata.keywords.split(',') : [],
          producer: metadata.producer || '',
          creationDate: metadata.creationDate || null,
          modificationDate: metadata.modificationDate || null,
        },
        pages: [],
        edits: [],
        createdAt: new Date(),
        lastModified: new Date(),
      };

      // Initialize pages array
      for (let i = 1; i <= pageCount; i++) {
        const dimensions = await this.renderEngine.getPageDimensions(i);
        this.document.pages.push({
          number: i,
          width: dimensions.width,
          height: dimensions.height,
          rotation: dimensions.rotation,
          canvas: null,
          textBlocks: [],
          edits: [],
          metadata: {
            isScanned: false,
            ocrProcessed: false,
            editCount: 0,
          },
        });
      }

      // Set exporter info
      this.pdfExporter.setOriginalDocument(filename, originalSize || buffer.byteLength);

      // Render first page
      await this.renderPage(1);

      stopMeasure();
      logger.info(`PDF loaded: ${filename}, ${pageCount} pages`);

      return this.document;
    } catch (error) {
      logger.error('Failed to load PDF', error);
      throw error;
    }
  }

  /**
   * Render a specific page
   */
  async renderPage(pageNum: number, zoom: number = 1.0): Promise<HTMLCanvasElement> {
    if (!this.document) {
      throw new Error('No document loaded');
    }

    if (pageNum < 1 || pageNum > this.document.pageCount) {
      throw new Error(`Invalid page number: ${pageNum}`);
    }

    // Render the page
    const canvas = await this.renderEngine.renderPage(pageNum, zoom);

    // Store canvas reference
    this.document.pages[pageNum - 1].canvas = canvas;
    this.currentPage = pageNum;

    // Display in canvas manager if available
    if (this.canvasManager) {
      this.canvasManager.renderPDFPage(canvas);
    }

    // Initialize text eraser for this page
    this.textEraser.initialize(canvas.width, canvas.height);

    return canvas;
  }

  /**
   * Detect text on current page
   */
  async detectText(pageNum?: number): Promise<TextBlock[]> {
    const page = pageNum || this.currentPage;
    const blocks = await this.textDetector.extractText(page);

    if (this.document && this.document.pages[page - 1]) {
      this.document.pages[page - 1].textBlocks = blocks;
    }

    return blocks;
  }

  /**
   * Run OCR on current page (for scanned documents)
   */
  async runOCR(
    pageNum?: number,
    onProgress?: (progress: number) => void
  ): Promise<TextBlock[]> {
    const page = pageNum || this.currentPage;
    const pageData = this.document?.pages[page - 1];

    if (!pageData?.canvas) {
      throw new Error('Page not rendered');
    }

    // Run OCR
    const result = await this.ocrService.runOCR(pageData.canvas, (progress) => {
      onProgress?.(progress.progress);
    });

    // Convert OCR results to text blocks
    const blocks: TextBlock[] = result.boxes.map((box) => ({
      id: generateId('ocr-block'),
      text: box.text,
      boxes: [],
      style: { ...DEFAULTS.TEXT_STYLE },
      source: 'ocr' as const,
      confidence: box.confidence,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      pageNumber: page,
    }));

    // Update page metadata
    if (pageData) {
      pageData.textBlocks = [...pageData.textBlocks, ...blocks];
      pageData.metadata.ocrProcessed = true;
    }

    return blocks;
  }

  /**
   * Find text block at coordinates
   */
  findTextAt(x: number, y: number): TextBlock | null {
    return this.textDetector.findBlockAtPosition(this.currentPage, x, y);
  }

  /**
   * Start editing a text block
   */
  async startEdit(
    blockId: string
  ): Promise<{ edit: Edit; style: TextStyle } | null> {
    const blocks = this.document?.pages[this.currentPage - 1]?.textBlocks || [];
    const block = blocks.find((b) => b.id === blockId);

    if (!block) {
      logger.warn(`Block not found: ${blockId}`);
      return null;
    }

    // Detect style from the block
    const canvas = this.document?.pages[this.currentPage - 1]?.canvas;
    let style = block.style;

    if (canvas && block.boxes.length > 0) {
      const detected = await this.styleDetector.detectStyle(canvas, block.boxes[0]);
      style = detected.style;
    }

    // Start edit
    const edit = this.editManager.startEdit(
      this.currentPage,
      blockId,
      block.text,
      { x: block.x, y: block.y },
      { x: block.x, y: block.y, width: block.width, height: block.height },
      style
    );

    return { edit, style };
  }

  /**
   * Confirm an edit
   */
  async confirmEdit(
    editId: string,
    newText: string,
    newStyle?: Partial<TextStyle>
  ): Promise<void> {
    const edit = this.editManager.getEdit(editId);
    if (!edit) {
      throw new Error(`Edit not found: ${editId}`);
    }

    const canvas = this.document?.pages[this.currentPage - 1]?.canvas;
    if (!canvas) {
      throw new Error('Page canvas not available');
    }

    // Detect background color
    const background = await this.backgroundDetector.detectBackground(
      canvas,
      edit.boundingBox
    );

    // Erase original text
    this.textEraser.eraseText(editId, edit.boundingBox, background.color);

    // Render new text
    const finalStyle = newStyle ? { ...edit.originalStyle, ...newStyle } : edit.originalStyle;
    this.textEraser.renderText(
      newText,
      edit.position.x,
      edit.position.y,
      finalStyle
    );

    // Confirm in edit manager
    this.editManager.confirmEdit(editId, newText, newStyle);

    // Re-render the page with edits
    await this.refreshCurrentPage();
  }

  /**
   * Cancel an edit
   */
  cancelEdit(editId: string): void {
    this.editManager.cancelEdit(editId);
  }

  /**
   * Undo last edit
   */
  async undo(): Promise<void> {
    const operation = this.editManager.undo();
    if (operation) {
      // Refresh page to show reverted state
      await this.refreshCurrentPage();
    }
  }

  /**
   * Redo last undone edit
   */
  async redo(): Promise<void> {
    const operation = this.editManager.redo();
    if (operation) {
      await this.refreshCurrentPage();
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.editManager.canUndo();
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.editManager.canRedo();
  }

  /**
   * Refresh the current page display
   */
  private async refreshCurrentPage(): Promise<void> {
    const canvas = await this.renderEngine.renderPage(this.currentPage);
    const composite = this.textEraser.composite(canvas);

    if (this.canvasManager) {
      this.canvasManager.renderPDFPage(composite);
    }
  }

  /**
   * Export the edited PDF
   */
  async exportPDF(options: ExportOptions = {}): Promise<ArrayBuffer> {
    if (!this.document) {
      throw new Error('No document loaded');
    }

    // Prepare pages for export
    const pages = [];
    for (let i = 1; i <= this.document.pageCount; i++) {
      // Ensure page is rendered
      const canvas = await this.renderEngine.renderPage(i);
      const pageData = this.document.pages[i - 1];

      // Get composite canvas with edits
      const edits = this.editManager.getPageEdits(i);
      const composite = edits.length > 0 ? this.textEraser.composite(canvas) : canvas;

      pages.push({
        canvas: composite,
        width: pageData.width,
        height: pageData.height,
        edits,
      });
    }

    // Generate and return PDF
    const result = await this.pdfExporter.exportPDF(pages, options);
    return result.buffer;
  }

  /**
   * Export and download the PDF
   */
  async downloadPDF(options: ExportOptions = {}): Promise<void> {
    if (!this.document) {
      throw new Error('No document loaded');
    }

    const pages = [];
    for (let i = 1; i <= this.document.pageCount; i++) {
      const canvas = await this.renderEngine.renderPage(i);
      const pageData = this.document.pages[i - 1];
      const edits = this.editManager.getPageEdits(i);
      const composite = edits.length > 0 ? this.textEraser.composite(canvas) : canvas;

      pages.push({
        canvas: composite,
        width: pageData.width,
        height: pageData.height,
        edits,
      });
    }

    await this.pdfExporter.exportAndDownload(pages, options);
  }

  // Getters
  get isLoaded(): boolean {
    return this.document !== null;
  }

  get pageCount(): number {
    return this.document?.pageCount || 0;
  }

  get currentPageNumber(): number {
    return this.currentPage;
  }

  getDocument(): PDFDocument | null {
    return this.document;
  }

  getEditCount(): number {
    return this.editManager.getTotalEditCount();
  }

  getContainer(): HTMLElement | null {
    return this.container;
  }

  /**
   * Calculate text reflow for edited content
   */
  calculateReflow(
    originalText: string,
    newText: string,
    originalBounds: BoundingBox,
    style: TextStyle
  ): ReflowResult {
    return this.reflowEngine.calculateReflow(originalText, newText, originalBounds, style);
  }

  /**
   * Go to a specific page
   */
  async goToPage(pageNum: number): Promise<void> {
    if (!this.document) return;
    if (pageNum < 1 || pageNum > this.document.pageCount) return;

    await this.renderPage(pageNum);
    this.currentPage = pageNum;
  }

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    if (this.currentPage < this.pageCount) {
      await this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Go to previous page
   */
  async previousPage(): Promise<void> {
    if (this.currentPage > 1) {
      await this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * Set zoom level
   */
  setZoom(level: number): void {
    this.canvasManager?.setZoom(level);
  }

  /**
   * Get current viewport state
   */
  getViewport(): ViewportState | null {
    return this.canvasManager?.getViewport() || null;
  }

  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    // Log all major events for debugging
    this.events.subscribe(EVENTS.DOCUMENT_LOADED, (data) => {
      logger.debug('Document loaded event', data);
    });

    this.events.subscribe(EVENTS.EDIT_CONFIRMED, (data) => {
      logger.debug('Edit confirmed event', data);
      if (this.document) {
        this.document.lastModified = new Date();
      }
    });

    this.events.subscribe(EVENTS.ERROR, (data) => {
      logger.error('Error event', data);
    });
  }

  /**
   * Destroy the editor and clean up resources
   */
  async destroy(): Promise<void> {
    await this.renderEngine.destroy();
    await this.ocrService.terminate();
    this.canvasManager?.destroy();
    this.editManager.clearAll();
    this.textDetector.clearCache();
    this.textEraser.clear();
    this.document = null;

    logger.info('PDFEditor destroyed');
  }
}

// Export factory function
export function createPDFEditor(config?: PDFEditorConfig): PDFEditor {
  return new PDFEditor(config);
}
