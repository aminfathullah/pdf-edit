/**
 * CanvasManager - Canvas Manipulation and Overlay Management
 * 
 * Manages the main PDF canvas and overlay canvas for edits.
 */

import type { ViewportState, BoundingBox } from '@core/types';
import { RENDERING } from '@core/constants';
import { clamp, debounce, throttle } from '@utils/helpers';
import { createLogger } from '@utils/logger';

const logger = createLogger('CanvasManager');

export class CanvasManager {
  private container: HTMLElement;
  private mainCanvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private mainContext: CanvasRenderingContext2D;
  private overlayContext: CanvasRenderingContext2D;
  private wrapper: HTMLDivElement;
  private viewport: ViewportState;
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };
  private onViewportChange?: (viewport: ViewportState) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.viewport = {
      zoom: RENDERING.DEFAULT_ZOOM,
      panX: 0,
      panY: 0,
      currentPage: 1,
    };

    // Create main canvas for PDF rendering
    this.mainCanvas = document.createElement('canvas');
    this.mainCanvas.className = 'pdf-canvas main-canvas';
    this.mainCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
    `;
    this.mainContext = this.mainCanvas.getContext('2d')!;

    // Create overlay canvas for edits
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.className = 'pdf-canvas overlay-canvas';
    this.overlayCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      pointer-events: none;
    `;
    this.overlayContext = this.overlayCanvas.getContext('2d')!;

    // Wrapper element to allow container scroll to reflect scaled canvas size
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'pdf-canvas-wrapper';
    this.wrapper.style.cssText = `
      position: relative;
      display: block;
      width: 0px;
      height: 0px;
    `;
    // Setup container
        this.container.style.position = 'relative';
        // NOTE: Do not override container overflow here - allow CSS to control scrolling
    this.wrapper.appendChild(this.mainCanvas);
    this.wrapper.appendChild(this.overlayCanvas);
    this.container.appendChild(this.wrapper);

    // Setup event handlers
    this.setupEventHandlers();

    logger.info('CanvasManager initialized');
  }

  /**
   * Render a PDF page canvas to the main canvas
   */
  renderPDFPage(sourceCanvas: HTMLCanvasElement): void {
    // Resize main canvas to match source
    this.mainCanvas.width = sourceCanvas.width;
    this.mainCanvas.height = sourceCanvas.height;
    this.mainCanvas.style.width = sourceCanvas.style.width;
    this.mainCanvas.style.height = sourceCanvas.style.height;

    // Resize overlay to match
    this.overlayCanvas.width = sourceCanvas.width;
    this.overlayCanvas.height = sourceCanvas.height;
    this.overlayCanvas.style.width = sourceCanvas.style.width;
    this.overlayCanvas.style.height = sourceCanvas.style.height;

    // Draw the PDF page
    this.mainContext.drawImage(sourceCanvas, 0, 0);

    // Update transform
    this.updateTransform();
    // Ensure container scroll reflects current viewport pan
    try {
      this.container.scrollLeft = -Math.round(this.viewport.panX);
      this.container.scrollTop = -Math.round(this.viewport.panY);
    } catch (e) {
      // ignore
    }

    logger.debug('PDF page rendered to canvas');
  }

  /**
   * Set zoom level
   */
  setZoom(level: number, centerX?: number, centerY?: number): void {
    const newZoom = clamp(level, RENDERING.MIN_ZOOM, RENDERING.MAX_ZOOM);

    if (newZoom === this.viewport.zoom) return;

    // Calculate zoom center for smooth zooming
    if (centerX !== undefined && centerY !== undefined) {
      const rect = this.container.getBoundingClientRect();
      const relativeX = centerX - rect.left;
      const relativeY = centerY - rect.top;

      // Adjust pan to keep the zoom centered
      const scaleDiff = newZoom / this.viewport.zoom;
      this.viewport.panX = relativeX - (relativeX - this.viewport.panX) * scaleDiff;
      this.viewport.panY = relativeY - (relativeY - this.viewport.panY) * scaleDiff;
    }

    this.viewport.zoom = newZoom;
    this.updateTransform();
    this.emitViewportChange();

    logger.debug(`Zoom set to ${newZoom}`);
  }

  /**
   * Zoom in by step
   */
  zoomIn(): void {
    this.setZoom(this.viewport.zoom + RENDERING.ZOOM_STEP);
  }

  /**
   * Zoom out by step
   */
  zoomOut(): void {
    this.setZoom(this.viewport.zoom - RENDERING.ZOOM_STEP);
  }

  /**
   * Reset zoom to 100%
   */
  resetZoom(): void {
    this.setZoom(1.0);
    this.viewport.panX = 0;
    this.viewport.panY = 0;
    this.updateTransform();
    this.emitViewportChange();
  }

  /**
   * Fit page to container width
   */
  fitToWidth(): void {
    const containerWidth = this.container.clientWidth;
    const canvasWidth = parseInt(this.mainCanvas.style.width) || this.mainCanvas.width;
    const zoom = containerWidth / canvasWidth;
    this.setZoom(zoom);
    this.viewport.panX = 0;
    this.updateTransform();
  }

  /**
   * Fit page to container
   */
  fitToPage(): void {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const canvasWidth = parseInt(this.mainCanvas.style.width) || this.mainCanvas.width;
    const canvasHeight = parseInt(this.mainCanvas.style.height) || this.mainCanvas.height;

    const zoomX = containerWidth / canvasWidth;
    const zoomY = containerHeight / canvasHeight;
    const zoom = Math.min(zoomX, zoomY);

    this.setZoom(zoom);
    this.viewport.panX = (containerWidth - canvasWidth * zoom) / 2;
    this.viewport.panY = (containerHeight - canvasHeight * zoom) / 2;
    this.updateTransform();
  }

  /**
   * Pan the view
   */
  pan(deltaX: number, deltaY: number): void {
    // Apply pan by updating container scroll (we treat pan as negative scroll)
    try {
      this.container.scrollLeft = this.container.scrollLeft - deltaX;
      this.container.scrollTop = this.container.scrollTop - deltaY;
      this.viewport.panX = -this.container.scrollLeft;
      this.viewport.panY = -this.container.scrollTop;
    } catch (e) {
      this.viewport.panX += deltaX;
      this.viewport.panY += deltaY;
    }
    this.updateTransform();
    this.emitViewportChange();
  }

  /**
   * Get current viewport state
   */
  getViewport(): ViewportState {
    return { ...this.viewport };
  }

  /**
   * Set viewport change callback
   */
  onViewportChanged(callback: (viewport: ViewportState) => void): void {
    this.onViewportChange = callback;
  }

  /**
   * Draw on the overlay canvas
   */
  drawOnOverlay(
    draw: (ctx: CanvasRenderingContext2D) => void
  ): void {
    draw(this.overlayContext);
  }

  /**
   * Draw a rectangle on overlay
   */
  drawRect(bbox: BoundingBox, color: string, lineWidth: number = 2): void {
    this.overlayContext.strokeStyle = color;
    this.overlayContext.lineWidth = lineWidth;
    this.overlayContext.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
  }

  /**
   * Fill a rectangle on overlay
   */
  fillRect(bbox: BoundingBox, color: string): void {
    this.overlayContext.fillStyle = color;
    this.overlayContext.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
  }

  /**
   * Draw text on overlay
   */
  drawText(
    text: string,
    x: number,
    y: number,
    font: string,
    color: string
  ): void {
    this.overlayContext.font = font;
    this.overlayContext.fillStyle = color;
    this.overlayContext.fillText(text, x, y);
  }

  /**
   * Clear the overlay canvas
   */
  clearOverlay(): void {
    this.overlayContext.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  /**
   * Get main canvas context
   */
  getMainContext(): CanvasRenderingContext2D {
    return this.mainContext;
  }

  /**
   * Get overlay canvas context
   */
  getOverlayContext(): CanvasRenderingContext2D {
    return this.overlayContext;
  }

  /**
   * Get main canvas element
   */
  getMainCanvas(): HTMLCanvasElement {
    return this.mainCanvas;
  }

  /**
   * Get overlay canvas element
   */
  getOverlayCanvas(): HTMLCanvasElement {
    return this.overlayCanvas;
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.wrapper.getBoundingClientRect();
    const x = (screenX - rect.left) / this.viewport.zoom;
    const y = (screenY - rect.top) / this.viewport.zoom;
    return { x, y };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    const rect = this.wrapper.getBoundingClientRect();
    const x = canvasX * this.viewport.zoom + rect.left;
    const y = canvasY * this.viewport.zoom + rect.top;
    return { x, y };
  }

  /**
   * Update canvas transform
   */
  private updateTransform(): void {
    // Apply scaling via size to allow scroll area to change and map pan via scroll
    const scaledWidth = this.mainCanvas.width * this.viewport.zoom;
    const scaledHeight = this.mainCanvas.height * this.viewport.zoom;
    this.mainCanvas.style.width = `${scaledWidth}px`;
    this.mainCanvas.style.height = `${scaledHeight}px`;
    this.overlayCanvas.style.width = `${scaledWidth}px`;
    this.overlayCanvas.style.height = `${scaledHeight}px`;

    // Keep canvases positioned at top-left within the wrapper (they are absolute), so adjust their transform to apply a non-layout translation
    // No CSS translate: use container scroll for panning instead. Clear transforms.
    this.mainCanvas.style.transform = 'none';
    this.overlayCanvas.style.transform = 'none';

    // Update wrapper size to match scaled canvas so container scrollbars behave properly
    this.wrapper.style.width = `${scaledWidth}px`;
    this.wrapper.style.height = `${scaledHeight}px`;

    // Note: container scroll is managed by pan() / scroll event to keep in sync
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Mouse wheel zoom
    const handleWheel = throttle((e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -RENDERING.ZOOM_STEP : RENDERING.ZOOM_STEP;
        this.setZoom(this.viewport.zoom + delta, e.clientX, e.clientY);
      }
    }, 50);

    this.container.addEventListener('wheel', handleWheel as EventListener, { passive: false });

    // Mouse drag for panning
    this.mainCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle mouse button or Alt+click for panning
        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.mainCanvas.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;
        this.pan(deltaX, deltaY);
        this.lastMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.mainCanvas.style.cursor = 'default';
    });

    // Keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            this.zoomIn();
            break;
          case '-':
            e.preventDefault();
            this.zoomOut();
            break;
          case '0':
            e.preventDefault();
            this.resetZoom();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Resize observer
    const resizeObserver = new ResizeObserver(
      debounce(() => {
        logger.debug('Container resized');
      }, 100)
    );
    resizeObserver.observe(this.container);

    // Sync container scroll with pan
    this.container.addEventListener('scroll', () => {
      // Map scroll to pan (scrollLeft increases as content moves left)
      this.viewport.panX = -this.container.scrollLeft;
      this.viewport.panY = -this.container.scrollTop;
      this.updateTransform();
      this.emitViewportChange();
    });
  }

  /**
   * Emit viewport change
   */
  private emitViewportChange(): void {
    this.onViewportChange?.(this.getViewport());
  }

  /**
   * Destroy the canvas manager
   */
  destroy(): void {
    if (this.container.contains(this.wrapper)) {
      this.container.removeChild(this.wrapper);
    } else {
      if (this.container.contains(this.mainCanvas)) this.container.removeChild(this.mainCanvas);
      if (this.container.contains(this.overlayCanvas)) this.container.removeChild(this.overlayCanvas);
    }
    logger.info('CanvasManager destroyed');
  }
}
